import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Role = "admin" | "user";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, supabase };
}

function validRole(value: unknown): value is Role {
  return value === "admin" || value === "user";
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const admin = createAdminClient();

    const { data: authData, error: authError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (authError) throw authError;

    const { data: profiles } = await auth.supabase
      .from("profiles")
      .select("id, email, role");

    const roleById = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile.role === "admin" ? "admin" : "user",
      ])
    );

    const users = authData.users.map((user) => {
      const metadataRole =
        user.user_metadata?.role === "admin" ? "admin" : "user";

      return {
        id: user.id,
        email: user.email ?? "",
        role: roleById.get(user.id) ?? metadataRole,
        emailConfirmedAt: user.email_confirmed_at ?? null,
        invitedAt: user.invited_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        isCurrentUser: user.id === auth.user.id,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load users." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = body.role;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!validRole(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const admin = createAdminClient();
    const redirectTo = `${request.nextUrl.origin}/auth/callback?next=/reset-password`;

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { role },
    });

    if (error) throw error;
    if (!data.user) throw new Error("Supabase did not return the invited user.");

    return NextResponse.json({
      ok: true,
      user: { id: data.user.id, email: data.user.email ?? email, role },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to invite user." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const role = body.role;

    if (!id || !validRole(role)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (id === auth.user.id && role !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin access." },
        { status: 400 }
      );
    }

    const { error: roleError } = await auth.supabase.rpc(
      "admin_set_user_role",
      { target_user_id: id, new_role: role }
    );

    if (roleError) throw roleError;

    const admin = createAdminClient();
    const { error: metadataError } = await admin.auth.admin.updateUserById(id, {
      user_metadata: { role },
    });

    if (metadataError) {
      console.error("Role metadata update failed:", metadataError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    if (id === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove user." },
      { status: 500 }
    );
  }
}
