import * as auth from "../services/auth.service.js";
const cookieOptions={httpOnly:true,sameSite:process.env.NODE_ENV==="production"?"strict":"lax",secure:process.env.NODE_ENV==="production",path:"/api/v1/auth"};
const meta=(req)=>({userAgent:req.get("user-agent"),ip:req.ip});
export async function login(req,res,next){try{const data=await auth.login(req.body||{},meta(req));const {refreshToken,...body}=data;res.cookie("refresh_token",refreshToken,{...cookieOptions,maxAge:Number(process.env.JWT_REFRESH_TTL_DAYS||7)*86400000});res.json({success:true,data:body});}catch(e){next(e);}}
export async function refresh(req,res,next){try{const data=await auth.refresh(req.cookies?.refresh_token,meta(req));const {refreshToken,...body}=data;res.cookie("refresh_token",refreshToken,{...cookieOptions,maxAge:Number(process.env.JWT_REFRESH_TTL_DAYS||7)*86400000});res.json({success:true,data:body});}catch(e){next(e);}}
export async function logout(req,res,next){try{await auth.logout(req.cookies?.refresh_token);res.clearCookie("refresh_token",cookieOptions);res.status(204).end();}catch(e){next(e);}}
export async function me(req,res,next){try{res.json({success:true,data:await auth.getMe(req.user.sub)});}catch(e){next(e);}}
export async function listUsers(req,res,next){try{res.json({success:true,data:await auth.listUsers()});}catch(e){next(e);}}
export async function createUser(req,res,next){try{res.status(201).json({success:true,data:await auth.createUser(req.body||{})});}catch(e){next(e);}}
export async function updateUser(req,res,next){try{res.json({success:true,data:await auth.updateUser(req.params.id,req.body||{})});}catch(e){next(e);}}
