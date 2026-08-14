import mongoose from "mongoose";
const schema = new mongoose.Schema({
  teacher:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},
  classroom:{type:mongoose.Schema.Types.ObjectId,ref:"Classroom",required:true,index:true},
  isActive:{type:Boolean,default:true,index:true}
},{timestamps:true});
schema.index({teacher:1,classroom:1},{unique:true});
export const TeacherClassroomAssignment=mongoose.model("TeacherClassroomAssignment",schema);
