import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface ChatSectionProps {
  onOpenChat: () => void;
}

export default function ChatSection({ onOpenChat }: ChatSectionProps) {
  return (
    <section className="w-full py-20 px-6 bg-background border-t border-border">
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-semibold text-foreground mb-4"
        >
          Chat with us now
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-muted-foreground text-base md:text-lg mb-8 leading-relaxed"
        >
          Use our handy AI assistant to learn more, or just leave your details for an email from the team!
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenChat}
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <MessageCircle className="w-6 h-6" />
          Start a Conversation
        </motion.button>
      </div>
    </section>
  );
}
