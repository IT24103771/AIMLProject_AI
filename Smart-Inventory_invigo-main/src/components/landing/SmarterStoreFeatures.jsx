import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ShoppingCart, BrainCircuit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isLoggedIn, hasRole } from "@/lib/auth";
const features = [
    {
        icon: ShoppingCart,
        title: "Staff Hub",
        description: "Quick POS-style sales entry, inventory scanning, and task management for your store.",
        path: "/staff",
    },
    {
        icon: BrainCircuit,
        title: "Admin Panel & AI Analytics",
        description: "Access your dashboard to manage inventory workflows, sales data, and predictive ML insights.",
        hasBadge: true,
        path: "/admin",
    },
];
const SmarterStoreFeatures = () => {
    const navigate = useNavigate();
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const handleFeatureClick = (featureTitle, featurePath) => {
        if (!isLoggedIn()) {
            navigate("/login");
            return;
        }

        if (featureTitle === "Staff Hub") {
            if (hasRole("ADMIN", "STAFF")) {
                navigate("/staff");
            } else {
                navigate("/login");
            }
        } else if (featureTitle.includes("Admin Panel")) {
            if (hasRole("ADMIN")) {
                navigate("/admin");
            } else {
                navigate("/login");
            }
        } else {
            navigate(featurePath);
        }
    };
    return (<section ref={ref} className="relative py-24">
            <div className="container mx-auto px-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="font-display font-alice-bold text-4xl md:text-5xl text-[#0F172A] leading-tight mb-6">
                        Everything you need to run a {" "}
                        <span className="text-[#007A5E]">smarter store</span>
                    </h2>
                    <p className="text-[#0F172A]/70 text-lg font-medium">
                        Six powerful features designed specifically for small grocery store owners.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {features.map((feature, i) => (<motion.div onClick={() => handleFeatureClick(feature.title, feature.path)} key={feature.title} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.6 }} className={`cursor-pointer relative bg-white rounded-[2rem] p-8 hover:shadow-2xl hover:scale-[1.02] transition-all group ${feature.hasBadge
                ? "border-2 border-[#9D1967]/30 shadow-[#9D1967]/10"
                : "border-2 border-[#0F172A]/20 shadow-lg shadow-black/5"}`}>
                            {feature.hasBadge && (<div className="absolute top-6 right-6">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#9D1967] bg-[#9D1967]/10 px-3 py-1 rounded-full border border-[#9D1967]/20">
                                        Powered by AI
                                    </span>
                                </div>)}
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.hasBadge ? "bg-[#9D1967]/10" : "bg-[#007A5E]/10"}`}>
                                <feature.icon size={24} className={feature.hasBadge ? "text-[#9D1967]" : "text-[#007A5E]"} strokeWidth={2}/>
                            </div>
                            <h3 className="font-display text-xl font-black text-[#0F172A] mb-3 pr-8">
                                {feature.title}
                            </h3>
                            <p className="text-[#0F172A]/60 font-medium leading-relaxed text-sm">
                                {feature.description}
                            </p>
                        </motion.div>))}
                </div>
            </div>
        </section>);
};
export default SmarterStoreFeatures;
