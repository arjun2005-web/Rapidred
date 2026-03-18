import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2, Droplets, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm RapidRed AI Assistant 🩸 I can help you find donors, check blood availability, or answer any questions about blood donation. How can I help you?",
    },
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // Fetch current donors from database to give AI real context
      const donorsRes = await fetch("/api/donors");
      const donors = donorsRes.ok ? await donorsRes.json() : [];

      const donorSummary = donors.length > 0
        ? donors.map((d: any) => `${d.name} (${d.bloodType}, ${d.location}, ${d.phone}, ${d.available ? "Available" : "Unavailable"})`).join("\n")
        : "No donors registered yet.";

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 1000,
          systemPrompt: `You are RapidRed AI Assistant, a helpful chatbot for a blood donation management system called RapidRed.

Your job is to:
1. Help users find blood donors by blood type and location
2. Answer questions about blood donation eligibility
3. Provide information about blood types and compatibility
4. Guide users on how to register as a donor
5. Answer general health questions related to blood donation

Current registered donors in the system:
${donorSummary}

Blood type compatibility:
- O- is universal donor (can donate to anyone)
- O+ can donate to O+, A+, B+, AB+
- A- can donate to A-, A+, AB-, AB+
- A+ can donate to A+, AB+
- B- can donate to B-, B+, AB-, AB+
- B+ can donate to B+, AB+
- AB- can donate to AB-, AB+
- AB+ can only donate to AB+
- AB+ is universal recipient (can receive from anyone)

Keep responses concise, helpful and friendly. Use emojis occasionally. 
If someone needs urgent blood, immediately show matching donors from the list above with their phone numbers.`,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    "Find O+ donors near me",
    "Who can donate to AB-?",
    "Am I eligible to donate?",
    "How to register as donor?",
  ];

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
          <Card className="flex flex-col shadow-2xl border-2 border-primary/20 overflow-hidden" style={{ height: "520px" }}>
            {/* Header */}
            <div className="blood-type-badge px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">RapidRed AI</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                    <span className="text-white/80 text-xs">Online</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 w-7 h-7"
                onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full blood-type-badge flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                      <Droplets className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${msg.role === "user"
                      ? "blood-type-badge text-white rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Loading */}
              {loading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full blood-type-badge flex items-center justify-center flex-shrink-0 mr-2">
                    <Droplets className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0 bg-background">
                {quickQuestions.map(q => (
                  <button key={q}
                    onClick={() => { setInput(q); }}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2 flex-shrink-0 bg-background">
              <Input
                placeholder="Ask about blood donors..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                className="rounded-xl border-2 focus:border-primary/50 text-sm"
                disabled={loading}
              />
              <Button
                size="icon"
                className="blood-type-badge border-0 text-white hover:opacity-90 flex-shrink-0 rounded-xl"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full blood-type-badge shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center"
      >
        {open
          ? <X className="w-6 h-6 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </>
  );
}