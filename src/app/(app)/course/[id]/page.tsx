import { notFound } from "next/navigation";
import { getCourse, touchCourse } from "@/server/courses";
import { getCourseProgress } from "@/server/progress";
import { CoursePlayer } from "./CoursePlayer";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();
  await touchCourse(id);
  const progress = await getCourseProgress(id);
  return <CoursePlayer courseId={id} tree={course.structure} initialProgress={progress} />;
}
