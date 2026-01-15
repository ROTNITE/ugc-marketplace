import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </Container>
    );
  }

  if (user.role !== "CREATOR") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Только для креаторов">
          Эта страница доступна только аккаунтам креаторов.
        </Alert>
      </Container>
    );
  }

  redirect("/dashboard/deals?tab=work");
}
