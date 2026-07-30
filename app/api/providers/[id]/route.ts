import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const COLLECTION = "providers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const docRef = db().collection(COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const dbData = docSnap.data();
    if (dbData?.ownerUid !== session.uid) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const body = await req.json();
    const { displayName, baseUrl, apiKeys, apiHeaders, enabled, manualModels } = body;

    const updateData: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (displayName !== undefined) {
      if (typeof displayName !== "string" || !displayName.trim()) {
        return NextResponse.json({ error: "Display name cannot be empty" }, { status: 400 });
      }
      updateData.displayName = displayName.trim();
    }

    if (baseUrl !== undefined) {
      updateData.baseUrl = baseUrl ? baseUrl.trim() : "";
    }

    if (apiKeys !== undefined) {
      if (!Array.isArray(apiKeys) || apiKeys.length === 0 || apiKeys.some((k) => !k.trim())) {
        return NextResponse.json({ error: "At least one valid API key is required" }, { status: 400 });
      }

      // Merge keys to preserve old plain text for masked keys sent by client
      const existingKeys = dbData?.apiKeys || [];
      const finalKeys = apiKeys.map((k: string, idx: number) => {
        const trimmed = k.trim();
        const isMask = trimmed.includes("••••") || trimmed === "••••••••";
        if (isMask) {
          // If it matches a masked string, keep the database value (if exists at same index)
          return existingKeys[idx] || trimmed;
        }
        return trimmed;
      });

      updateData.apiKeys = finalKeys.filter((k) => k && !k.includes("••••"));
      if (updateData.apiKeys.length === 0) {
        return NextResponse.json({ error: "At least one valid non-masked key is required" }, { status: 400 });
      }
    }

    if (apiHeaders !== undefined) {
      updateData.apiHeaders = apiHeaders;
    }

    if (enabled !== undefined) {
      updateData.enabled = !!enabled;
    }

    if (manualModels !== undefined) {
      updateData.manualModels = Array.isArray(manualModels)
        ? manualModels.map((m: unknown) => String(m).trim()).filter(Boolean)
        : [];
    }

    await docRef.update(updateData);

    // Invalidate model cache so changes take effect immediately
    try {
      await db().collection("model_caches").doc(id).delete();
    } catch {}

    // Get final keys array to return masked representation
    const mergedKeys = updateData.apiKeys || dbData?.apiKeys || [];
    const maskedKeys = mergedKeys.map((k: string) => {
      if (k.length <= 8) return "••••••••";
      return k.slice(0, 4) + "••••" + k.slice(-4);
    });

    return NextResponse.json({
      success: true,
      provider: {
        id,
        ...dbData,
        ...updateData,
        apiKeys: maskedKeys,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update provider" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const docRef = db().collection(COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const dbData = docSnap.data();
    if (dbData?.ownerUid !== session.uid) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // Delete the provider document
    await docRef.delete();

    // Clean up caches if any exist
    try {
      await db().collection("model_caches").doc(id).delete();
    } catch {}

    return NextResponse.json({ success: true, deleted: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete provider" }, { status: 500 });
  }
}
