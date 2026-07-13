import { CourseLoader } from "./CourseLoader";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseLoader courseId={id} />;
}
