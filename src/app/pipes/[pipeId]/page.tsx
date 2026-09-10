import { PipeBoardClient } from "./page-client";

export default async function PipePage({
  params,
}: {
  params: Promise<{ pipeId: string }>;
}) {
  const { pipeId } = await params;
  return <PipeBoardClient pipeId={pipeId} />;
}
