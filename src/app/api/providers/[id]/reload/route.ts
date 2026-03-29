import { modelRegistry } from '@/lib/models/registry';
import { NextRequest } from 'next/server';

export const POST = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  try {
    const provider = await modelRegistry.refreshProvider(id);
    return Response.json({ provider }, { status: 200 });
  } catch (err: any) {
    return Response.json({ message: err.message }, { status: 500 });
  }
};
