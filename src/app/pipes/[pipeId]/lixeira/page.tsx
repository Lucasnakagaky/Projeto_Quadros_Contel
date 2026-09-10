import { LixeiraClient } from "./page-client";

export default async function LixeiraPage({
  params,
}: {
  params: Promise<{ pipeId: string }>;
}) {
  const { pipeId } = await params;
  return <LixeiraClient pipeId={pipeId} />;
}
