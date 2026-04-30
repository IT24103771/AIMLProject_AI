import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { logout } from "@/lib/auth";

const LogoutButton = ({ className }) => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogout = () => {
        logout();

        toast({
            title: "Logged out successfully",
            description: "Redirecting to home page...",
            duration: 2000,
        });

        navigate("/");
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <button className={className}>
                    <LogOut size={16} />
                    Log Out Session
                </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="glass-dark border-white/10 text-white rounded-[2rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black">
                        Confirm Logout
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60 font-medium">
                        Are you sure you want to end your current session? You will need to log in again to access the portal.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="mt-6 gap-3">
                    <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl py-6 px-8 border-none font-bold">
                        Stay Logged In
                    </AlertDialogCancel>

                    <AlertDialogAction
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-xl py-6 px-8 border-none font-bold shadow-lg shadow-red-500/20"
                    >
                        Yes, Log Out
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default LogoutButton;