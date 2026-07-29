import { notFound } from "next/navigation";
import { readDb } from "@/lib/db";
import { MembersManager } from "@/components/boards/members-manager";

export default async function BoardMembersPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const db = await readDb();
  const board = db.boards.find((b) => b.id === boardId);
  if (!board) notFound();

  const membros = db.usuarios.filter((u) => board.membroIds.includes(u.id));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <MembersManager board={board} membrosIniciais={membros} />
    </div>
  );
}
