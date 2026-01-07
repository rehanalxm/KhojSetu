import { Github, Linkedin, Twitter, Heart, MapPin, Globe, Shield, HelpCircle, Compass, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    const handleHomeClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => window.location.reload(), 300);
    };

    const footerLinks = [
        {
            title: "Navigation",
            links: [
                { name: "Live Map View", icon: Compass, href: "#" },
                { name: "Trending Feed", icon: Globe, href: "#" },
                { name: "Item Categories", icon: Compass, href: "#" },
            ]
        },
        {
            title: "Safety & Support",
            links: [
                { name: "Privacy Policy", icon: Shield, href: "#" },
                { name: "Terms & Rules", icon: HelpCircle, href: "#" },
                { name: "Help Center", icon: Shield, href: "#" },
            ]
        }
    ];

    return (
        <footer className="relative mt-40 border-t border-white/5 bg-background overflow-hidden">
            {/* Artistic Background Elements */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

                    {/* Brand & Narrative - 6 Columns */}
                    <div className="lg:col-span-6 space-y-10">
                        <div
                            className="flex items-center gap-3 cursor-pointer group w-fit"
                            onClick={handleHomeClick}
                        >
                            <div className="bg-gradient-to-tr from-primary to-indigo-600 p-2.5 rounded-2xl shadow-2xl shadow-primary/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <MapPin className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-text tracking-tight uppercase">KhojSetu</h1>
                                <div className="h-0.5 w-full bg-gradient-to-r from-primary to-transparent mt-1" />
                            </div>
                        </div>

                        <div className="space-y-6 max-w-lg">
                            <h3 className="text-lg font-bold text-text bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                Why KhojSetu Exists
                            </h3>
                            <p className="text-muted text-lg leading-relaxed font-medium">
                                We've all felt that sinking feeling of losing something valuable. KhojSetu isn't just a lost and found tool; it's a <span className="text-text font-bold text-primary italic">Bridge of Kindness</span>.
                            </p>
                            <p className="text-muted/80 text-sm leading-relaxed">
                                Our purpose is to orchestrate community-driven reunions. By leveraging real-time geospatial intelligence and direct peer-to-peer communication, we empower individuals to help one another, turning accidental losses into stories of human connection.
                            </p>
                        </div>

                        {/* Social Row */}
                        <div className="flex gap-4">
                            {[Twitter, Github, Linkedin].map((Icon, i) => (
                                <motion.a
                                    key={i}
                                    href="#"
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                                    className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-muted hover:text-primary transition-all duration-300"
                                >
                                    <Icon className="w-5 h-5" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {/* Links & Quick Actions - 6 Columns */}
                    <div className="lg:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-12 lg:pl-12">
                        {footerLinks.map((section, i) => (
                            <div key={i} className="space-y-8">
                                <h4 className="text-xs font-black text-text uppercase tracking-[0.2em] opacity-50">{section.title}</h4>
                                <ul className="space-y-5">
                                    {section.links.map((link, j) => (
                                        <li key={j}>
                                            <a href={link.href} className="group flex items-center gap-3 text-sm font-semibold text-muted hover:text-primary transition-all duration-300">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                                                {link.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {/* Status / Location Meta */}
                        <div className="space-y-8 hidden md:block">
                            <h4 className="text-xs font-black text-text uppercase tracking-[0.2em] opacity-50">Operations</h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 w-fit rounded-full">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-green-500 uppercase">Live Everywhere</span>
                                </div>
                                <p className="text-[11px] text-muted font-medium leading-tight">
                                    Monitoring thousands of items across your local area.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final Credits Bar - Unified & World Class */}
                <div className="mt-24 pt-10 border-t border-white/5 flex flex-col xl:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-8 flex-wrap justify-center text-[13px] font-bold text-muted/60">
                        <span className="text-text/30 uppercase tracking-[0.1em]">© {currentYear} KhojSetu Platform</span>
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Guidelines</a>
                    </div>

                    <a
                        href="https://rehanalxm.github.io/My-Portfolio/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all duration-500 flex items-center gap-3 active:scale-95"
                    >
                        <div className="flex items-center gap-2.5 text-[13px] font-bold text-muted group-hover:text-text transition-colors">
                            <span>Designed & Developed with</span>
                            <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                            </motion.div>
                            <span>by</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <span className="text-[14px] font-black text-white bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent group-hover:tracking-wider transition-all duration-500">
                            REHAN ALAM
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>
            </div>

            {/* Bottom Safe Area for Mobile Nav */}
            <div className="h-28 md:hidden" />
        </footer>
    );
}
