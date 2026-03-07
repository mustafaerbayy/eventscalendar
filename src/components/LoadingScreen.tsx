import { motion } from "framer-motion";

const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black">
            {/* Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-col items-center gap-8"
            >
                {/* Rotating Logo Container */}
                <div className="relative">
                    {/* Outer Rotating Glow */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-[-20px] rounded-full border border-primary/20 border-t-primary/60 border-l-primary/40 shadow-[0_0_30px_rgba(184,134,11,0.2)]"
                    />

                    {/* Logo */}
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="relative h-24 w-24 md:h-32 md:w-32 flex items-center justify-center"
                    >
                        <img
                            src="/images/logo.png"
                            alt="Logo"
                            className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        />
                    </motion.div>
                </div>

                {/* Loading Text */}
                <div className="flex flex-col items-center gap-2">
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-xs font-black tracking-[0.4em] uppercase text-primary/80"
                    >
                        Yükleniyor
                    </motion.div>
                    <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                className="w-1.5 h-1.5 rounded-full bg-primary"
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LoadingScreen;
