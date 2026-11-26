 "use client";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function SignOutButton(){
 const router=useRouter();
 return <button onClick={async()=>{await supabase?.auth.signOut();router.push("/sign-in");router.refresh();}}>Cerrar sesión</button>;
}
