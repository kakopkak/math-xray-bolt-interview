import SubmitClient from "./submit-client";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Assignment } from "@/lib/models/assignment";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SubmitPage({ params }: PageProps) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectDB();
  const assignment = await Assignment.findById(id).select("title description gradeLevel").lean();
  if (!assignment) {
    notFound();
  }

  return (
    <SubmitClient
      assignmentId={id}
      assignment={{
        title: assignment.title,
        description: assignment.description,
        gradeLevel: assignment.gradeLevel,
        classLabel: assignment.classLabel || "",
      }}
    />
  );
}
