/**
 * Invite join page.
 *
 * Allows a participant to join an existing conversation using a valid invite.
 */

import { InviteJoinPanel } from "@/features/invite/InviteJoinPanel";
import "@/styles/invite.css";

type JoinPageProps = {
  searchParams: Promise<{
    invite?: string;
  }>;
};

export default async function JoinPage({
  searchParams,
}: JoinPageProps) {
  const params = await searchParams;

  return (
    <InviteJoinPanel
      inviteToken={params.invite ?? ""}
    />
  );
}