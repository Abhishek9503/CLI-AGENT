"use client"

import { authClient } from "@/lib/auth-client"


import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useState } from "react"
import { ShieldAlert } from "lucide-react"
import { setISODay } from "date-fns"
import router from "next/dist/shared/lib/router/router"

const DevicePageAuthorization = () => {
    const [userCode, setUserCode] = useState("")
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const router = useRouter();


    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4, 8);
        }
        setUserCode(value);

    }


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const formattedCode = userCode.trim().replace(/-/g, '').toUpperCase();
            const response = await authClient.device({ query: { user_code: formattedCode } });

            if (response.data) {
                router.push(`/approve?user_code=${formattedCode}`);
            }
        } catch (error) {
            setError("Invalid or expired code . Please try again.");
            setIsLoading(false);
        }
        finally {
            setIsLoading(false);
        }

    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w=full max-w-md">

                {/* Header Section  */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="p-3 rounded-lg border-2 border-dashed border-zinc-700">
                        <ShieldAlert className="w-12 h-12 text-yellow-300" />
                    </div>

                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-foreground mb-2">Device Authorization </h1>
                        <p className="text-muted-foreground ">Enter your device code to continue </p>
                    </div>
                </div>

                <form action=""
                    onSubmit={handleSubmit}
                    className="border-2 border-dashed border-zinc-700 rounded-xl p-8 bg-zinc-950 backdrop-blur-sm"
                >
                    <div className="space-y-6">
                        <label htmlFor="code" className="block text-sm font-medium text-foreground mb-2">Device Code</label>

                        <input type="text" id="code" value={userCode} onChange={handleCodeChange} placeholder="XXXX-XXXX" maxLength={9} className="w-full px-4 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-zinc-600 font-mono text-center text-lg tracking-widest" />
                        <p className="text-xs text-muted-foreground mt-2">find this code on the device you want to authorize</p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-950 border-r-red-900 text-red-50 text-sm">{error}</div>
                    )}

                    <button type="submit" disabled={isLoading && userCode.length < 9} className="w-full py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? "Authorizing..." : "Authorize Device"}
                    </button>


                    {/* Info Box  */}
                    <div className="p-4 mt-5 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg">
                        <p className="text-xs text-muted-foreground leading-relaxed">This is code is unique to your device and will expire shortly . Keep it confidential and never share with anyone

                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}


export default DevicePageAuthorization