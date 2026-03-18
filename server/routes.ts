import type { Express } from "express";
import { type Server } from "http";
import { Server as SocketServer } from "socket.io";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, donors, hospitals, bloodInventory, bloodRequests } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── SOCKET.IO SETUP ────────────────────────────────────────────────────
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // ── AUTH ────────────────────────────────────────────────────────────────

  // REGISTER
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, role = "donor" } = req.body;
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await db.insert(users).values({ email, password: hashedPassword, role }).returning();
      res.status(201).json({ id: newUser[0].id, email: newUser[0].email, role: newUser[0].role });
    } catch (e) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // LOGIN
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await db.select().from(users).where(eq(users.email, email));
      if (user.length === 0) return res.status(400).json({ message: "Invalid credentials" });
      const validPassword = await bcrypt.compare(password, user[0].password);
      if (!validPassword) return res.status(400).json({ message: "Invalid credentials" });
      res.json({ message: "Login successful", user: { id: user[0].id, email: user[0].email, role: user[0].role } });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── DONORS ──────────────────────────────────────────────────────────────

  // GET all donors (for Home page)
  app.get("/api/donors", async (req, res) => {
    try {
      const { bloodType } = req.query;
      let query = db.select().from(donors).orderBy(desc(donors.createdAt));
      const allDonors = await query;
      const filtered = bloodType && bloodType !== "All"
        ? allDonors.filter(d => d.bloodType === bloodType)
        : allDonors;
      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET single donor by userId
  app.get("/api/donors/me/:userId", async (req, res) => {
    try {
      const donor = await db.select().from(donors).where(eq(donors.userId, req.params.userId));
      if (donor.length === 0) return res.status(404).json({ message: "Donor profile not found" });
      res.json(donor[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // CREATE donor profile
  app.post("/api/donors", async (req, res) => {
    try {
      const { userId, name, bloodType, phone, location, age, weight, lastDonation, available, latitude, longitude, email, dob } = req.body;
      
      // Only check for existing profile if userId is provided
      if (userId) {
        const existing = await db.select().from(donors).where(eq(donors.userId, userId));
        if (existing.length > 0) {
          // Update existing donor profile
          const updated = await db.update(donors)
            .set({ name, bloodType, phone, location, age, weight, lastDonation, available, latitude, longitude, email, dob })
            .where(eq(donors.userId, userId))
            .returning();
          return res.json(updated[0]);
        }
      }

      // Always create new donor if no userId or no existing profile found
      const newDonor = await db.insert(donors).values({
        userId: userId || null,
        name, bloodType, phone, location, age, weight, lastDonation,
        available: available ?? true,
        latitude: latitude || null,
        longitude: longitude || null,
        email: email || null,
        dob: dob || null,
      }).returning();
      // Emit real-time event
      io.emit("donor:new", newDonor[0]);
      res.status(201).json(newDonor[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // UPDATE donor availability
  app.patch("/api/donors/:id/availability", async (req, res) => {
    try {
      const { available } = req.body;
      const updated = await db.update(donors).set({ available }).where(eq(donors.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // DELETE donor (admin only)
  app.delete("/api/donors/:id", async (req, res) => {
    try {
      await db.delete(donors).where(eq(donors.id, req.params.id));
      res.json({ message: "Donor deleted" });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── HOSPITALS ────────────────────────────────────────────────────────────

  // GET all hospitals (admin)
  app.get("/api/hospitals", async (req, res) => {
    try {
      const all = await db.select().from(hospitals).orderBy(desc(hospitals.createdAt));
      res.json(all);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET hospital by userId
  app.get("/api/hospitals/me/:userId", async (req, res) => {
    try {
      const hospital = await db.select().from(hospitals).where(eq(hospitals.userId, req.params.userId));
      if (hospital.length === 0) return res.status(404).json({ message: "Hospital not found" });
      res.json(hospital[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // CREATE hospital profile
  app.post("/api/hospitals", async (req, res) => {
    try {
      const { userId, name, location, phone, licenseNumber } = req.body;
      const existing = await db.select().from(hospitals).where(eq(hospitals.userId, userId));
      if (existing.length > 0) {
        const updated = await db.update(hospitals)
          .set({ name, location, phone, licenseNumber })
          .where(eq(hospitals.userId, userId))
          .returning();
        return res.json(updated[0]);
      }
      const newHospital = await db.insert(hospitals).values({ userId, name, location, phone, licenseNumber }).returning();

      // Auto-create blood inventory rows for new hospital
      const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
      for (const bt of bloodTypes) {
        await db.insert(bloodInventory).values({ hospitalId: newHospital[0].id, bloodType: bt, units: 0 });
      }

      res.status(201).json(newHospital[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── BLOOD INVENTORY ──────────────────────────────────────────────────────

  // GET inventory for a hospital
  app.get("/api/inventory/:hospitalId", async (req, res) => {
    try {
      const inv = await db.select().from(bloodInventory).where(eq(bloodInventory.hospitalId, req.params.hospitalId));
      res.json(inv);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET all inventory (admin overview)
  app.get("/api/inventory", async (req, res) => {
    try {
      const inv = await db.select().from(bloodInventory);
      res.json(inv);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // UPDATE inventory (units + expiry fields)
  app.patch("/api/inventory/:id", async (req, res) => {
    try {
      const { units, dateAdded, expiryDate, urgencyLevel } = req.body;
      const updated = await db.update(bloodInventory)
        .set({ units, dateAdded, expiryDate, urgencyLevel, updatedAt: new Date() })
        .where(eq(bloodInventory.id, req.params.id))
        .returning();
      res.json(updated[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // CREATE new inventory item
  app.post("/api/inventory", async (req, res) => {
    try {
      const { hospitalId, bloodType, units, dateAdded, expiryDate, urgencyLevel } = req.body;
      const newItem = await db.insert(bloodInventory)
        .values({ hospitalId, bloodType, units, dateAdded, expiryDate, urgencyLevel })
        .returning();
      res.status(201).json(newItem[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // DELETE inventory item
  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      await db.delete(bloodInventory).where(eq(bloodInventory.id, req.params.id));
      res.json({ message: "Deleted" });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── BLOOD REQUESTS ───────────────────────────────────────────────────────

  // GET all requests (admin)
  app.get("/api/requests", async (req, res) => {
    try {
      const all = await db.select().from(bloodRequests).orderBy(desc(bloodRequests.createdAt));
      res.json(all);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET requests for a hospital
  app.get("/api/requests/:hospitalId", async (req, res) => {
    try {
      const reqs = await db.select().from(bloodRequests)
        .where(eq(bloodRequests.hospitalId, req.params.hospitalId))
        .orderBy(desc(bloodRequests.createdAt));
      res.json(reqs);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // CREATE blood request
  app.post("/api/requests", async (req, res) => {
    try {
      const { hospitalId, bloodType, units, urgency, department, patientId, requestedBy } = req.body;
      const newReq = await db.insert(bloodRequests).values({
        hospitalId, bloodType, units, urgency: urgency || "Normal",
        department, patientId, requestedBy, status: "Pending",
      }).returning();

      // Emit real-time event
      io.emit("request:new", newReq[0]);

      // Auto email alert for Critical/High requests
      if ((urgency === "Critical" || urgency === "High") && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
          const compatMap: Record<string, string[]> = {
            "A+":  ["A+", "A-", "O+", "O-"],
  "A-":  ["A-", "O-"],
  "B+":  ["B+", "B-", "O+", "O-"],
  "B-":  ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+":  ["O+", "O-"],
  "O-":  ["O-"],
          };
          const compatible = compatMap[bloodType] || [bloodType];
          const allDonors = await db.select().from(donors).where(eq(donors.available, true));
          const eligibleDonors = allDonors.filter((d: any) => compatible.includes(d.bloodType) && d.email);
          
          if (eligibleDonors.length > 0) {
            const nodemailer = await import("nodemailer");
            const transporter = nodemailer.default.createTransport({
              service: "gmail",
              auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            });
            const hosp = await db.select().from(hospitals).where(eq(hospitals.id, hospitalId));
            const hospName = hosp[0]?.name || "A hospital";
            const hospLocation = hosp[0]?.location || "";
            const hospPhone = hosp[0]?.phone || "";

            for (const donor of eligibleDonors) {
              await transporter.sendMail({
                from: `"RapidRed Alert 🩸" <${process.env.EMAIL_USER}>`,
                to: donor.email,
                subject: `🚨 ${urgency} Blood Request - ${bloodType} Needed Urgently`,
                html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                  <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
                    <h1 style="color:white;margin:0;font-size:28px;">🩸 RapidRed</h1>
                    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">Emergency Blood Alert</p>
                  </div>
                  <div style="background:#fff;padding:30px;border:1px solid #eee;border-radius:0 0 12px 12px;">
                    <p style="font-size:16px;">Dear <strong>${donor.name}</strong>,</p>
                    <p>You are registered as a <strong>${donor.bloodType}</strong> donor. Your blood is urgently needed!</p>
                    <div style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0;">
                      <p style="margin:0;color:#dc2626;font-weight:bold;font-size:18px;">⚠️ ${urgency} Request</p>
                      <p style="margin:8px 0 0;"><strong>Blood Type Needed:</strong> ${bloodType}</p>
                      <p style="margin:4px 0;"><strong>Units Required:</strong> ${units}</p>
                      <p style="margin:4px 0;"><strong>Hospital:</strong> ${hospName}</p>
                      <p style="margin:4px 0;"><strong>Location:</strong> ${hospLocation}</p>
                      <p style="margin:4px 0;"><strong>Contact:</strong> ${hospPhone}</p>
                      ${department ? `<p style="margin:4px 0;"><strong>Department:</strong> ${department}</p>` : ""}
                    </div>
                    <p style="font-size:15px;font-weight:bold;color:#dc2626;">Please contact the hospital immediately if you are available to donate!</p>
                    <p style="color:#666;font-size:12px;margin-top:20px;">
                      This is an automated alert from RapidRed AI Blood Management System.<br/>
                      CSD 334 Mini Project · 2023-2027 Batch
                    </p>
                  </div>
                </div>`,
              }).catch((err: any) => console.log("Email failed for", donor.email, err.message));
            }
            console.log(`📧 Sent ${urgency} blood alert emails to ${eligibleDonors.length} donors`);
          }
        } catch(emailErr) {
          console.log("Email alert error:", emailErr);
        }
      }

      res.status(201).json(newReq[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // UPDATE hospital profile
  app.patch("/api/hospitals/:id", async (req, res) => {
    try {
      const { name, location, phone } = req.body;
      const updated = await db.update(hospitals)
        .set({ name, location, phone })
        .where(eq(hospitals.id, req.params.id))
        .returning();
      res.json(updated[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // UPDATE request status
  app.patch("/api/requests/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await db.update(bloodRequests).set({ status }).where(eq(bloodRequests.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── ADMIN STATS ──────────────────────────────────────────────────────────

  // GET dashboard stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const allDonors = await db.select().from(donors);
      const allHospitals = await db.select().from(hospitals);
      const allRequests = await db.select().from(bloodRequests);
      const pendingRequests = allRequests.filter(r => r.status === "Pending");
      const activeDonors = allDonors.filter(d => d.available);

      res.json({
        totalDonors: allDonors.length,
        activeDonors: activeDonors.length,
        totalHospitals: allHospitals.length,
        totalRequests: allRequests.length,
        pendingRequests: pendingRequests.length,
      });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Email Alert Route
  app.post("/api/alerts/email", async (req, res) => {
    try {
      const { donorName, donorEmail, bloodType, hospitalName, location, phone } = req.body;
      // Using nodemailer with gmail
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER || "",
          pass: process.env.EMAIL_PASS || "",
        },
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: donorEmail,
        subject: `🩸 Urgent Blood Request - ${bloodType} Needed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🩸 RapidRed</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Emergency Blood Request</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none;">
              <p style="font-size: 16px;">Dear <strong>${donorName}</strong>,</p>
              <p>You are a registered <strong>${bloodType}</strong> donor in the RapidRed system.</p>
              <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #dc2626; font-weight: bold; font-size: 18px;">⚠️ Urgent Request</p>
                <p style="margin: 8px 0 0;"><strong>Blood Type Needed:</strong> ${bloodType}</p>
                <p style="margin: 4px 0;"><strong>Hospital:</strong> ${hospitalName}</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> ${location}</p>
                <p style="margin: 4px 0;"><strong>Contact:</strong> ${phone}</p>
              </div>
              <p>If you are available to donate, please contact the hospital immediately.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated alert from RapidRed AI Blood Management System.</p>
            </div>
          </div>
        `,
      });
      res.json({ message: "Alert sent successfully" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to send email", details: err.message });
    }
  });

  // AI Chat Route - Groq API
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, systemPrompt } = req.body;
      const groqMessages = systemPrompt
        ? [{ role: "system", content: systemPrompt }, ...messages]
        : messages;
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 1000,
          messages: groqMessages,
        }),
      });
      const data = await response.json();
      // Convert Groq response format to match what frontend expects
      const text = data.choices?.[0]?.message?.content || "Sorry, I could not process that.";
      res.json({ content: [{ type: "text", text }] });
    } catch {
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  return httpServer;
}