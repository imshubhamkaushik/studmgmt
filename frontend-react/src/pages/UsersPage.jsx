import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as api from "../api/auth";
import { useToast } from "../components/common/ToastProvider";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function UsersPage(){
 const qc=useQueryClient(); const toast=useToast(); const [form,setForm]=useState({name:"",email:"",password:"",role:"staff"});
 const {data,isLoading,error}=useQuery({queryKey:["users"],queryFn:api.getUsers});
 const create=useMutation({mutationFn:api.createUser,onSuccess:()=>{qc.invalidateQueries({queryKey:["users"]});toast.success("User created.");setForm({name:"",email:"",password:"",role:"staff"});},onError:e=>toast.error(getApiErrorMessage(e))});
 const users=data?.data||[];
 return <section className="page-section"><div className="section-heading"><div><h2>Users & Roles</h2><p>Administrators manage access. Teachers can mark attendance; staff can manage student records.</p></div></div>
 <form className="user-form" onSubmit={e=>{e.preventDefault();create.mutate(form)}}><input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><input type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/><input type="password" placeholder="Password (min 12 characters)" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} minLength="12" required/><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="staff">Staff</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select><button disabled={create.isPending}>Add user</button></form>
 {isLoading?<p>Loading users…</p>:error?<p className="inline-error">{getApiErrorMessage(error)}</p>:<div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th></tr></thead><tbody>{users.map(u=><tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.isActive?"Active":"Inactive"}</td><td>{u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString():"Never"}</td></tr>)}</tbody></table></div>}
 </section>
}
