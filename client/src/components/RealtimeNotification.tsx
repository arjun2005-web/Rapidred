import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Droplets, ClipboardList, PackageOpen, CheckCircle } from "lucide-react";

interface Notification {
  id: string;
  type: "donor" | "request" | "inventory";
  message: string;
  time: Date;
  read: boolean;
}

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen]   = useState(false);
  const { on }            = useSocket();

  useEffect(() => {
    // Listen for new donor
    const offDonor = on("donor:new", (donor: any) => {
      addNotification({
        type: "donor",
        message: `New donor registered: ${donor.name} (${donor.bloodType}) from ${donor.location}`,
      });
    });

    // Listen for new blood request
    const offRequest = on("request:new", (request: any) => {
      addNotification({
        type: "request",
        message: `New blood request: ${request.bloodType} — ${request.units} units (${request.urgency})`,
      });
    });

    // Listen for inventory update
    const offInventory = on("inventory:updated", (item: any) => {
      addNotification({
        type: "inventory",
        message: `Inventory updated: ${item.bloodType} — ${item.units} units (${item.urgencyLevel})`,
      });
    });

    return () => {
      offDonor();
      offRequest();
      offInventory();
    };
  }, [on]);

  const addNotification = ({ type, message }: { type: Notification["type"]; message: string }) => {
    const notif: Notification = {
      id: Date.now().toString(),
      type, message,
      time: new Date(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 20));
  };

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const remove = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const typeConfig = {
    donor:     { icon: <Droplets className="w-4 h-4 text-green-500" />,   bg: "bg-green-500/10",  label: "New Donor"   },
    request:   { icon: <ClipboardList className="w-4 h-4 text-red-500" />, bg: "bg-red-500/10",   label: "Request"     },
    inventory: { icon: <PackageOpen className="w-4 h-4 text-blue-500" />,  bg: "bg-blue-500/10",  label: "Inventory"   },
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative w-9 h-9 rounded-xl border-2 border-border hover:border-primary/50 flex items-center justify-center transition-all">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 blood-type-badge rounded-full text-white text-xs flex items-center justify-center font-bold animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 z-50">
          <Card className="shadow-2xl border-2 border-primary/20 overflow-hidden">
            {/* Header */}
            <div className="blood-type-badge px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">Live Notifications</span>
                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications */}
            <div className="max-h-80 overflow-y-auto bg-background">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <CheckCircle className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground">Real-time updates will appear here</p>
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = typeConfig[n.type];
                  return (
                    <div key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors
                        ${!n.read ? "bg-primary/5" : ""}`}>
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">{cfg.label}</Badge>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                        <p className="text-xs text-foreground leading-snug">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {n.time.toLocaleTimeString()}
                        </p>
                      </div>
                      <button onClick={() => remove(n.id)}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
                <button onClick={() => setNotifications([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Clear all notifications
                </button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}