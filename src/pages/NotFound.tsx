import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-sm"
      >
        <div className="inline-flex rounded-2xl bg-destructive/8 p-5 mb-6 ring-1 ring-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive/70" />
        </div>
        <p className="text-7xl font-extrabold tracking-tighter text-foreground/10 mb-2">404</p>
        <h1 className="text-xl font-bold tracking-tight mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="outline" className="rounded-xl gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;