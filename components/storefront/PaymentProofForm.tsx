"use client";
import { useActionState } from "react";
import { submitPaymentProofAction } from "@/actions/storefront";
import { Alert, Button, Input, Select } from "@/components/ui";
import { ImageUploader } from "@/components/ui/client";

export function PaymentProofForm({ orderId, accounts }: { orderId: number; accounts: { id: number; label: string }[] }) {
  const [state, action, pending] = useActionState(submitPaymentProofAction, undefined);
  if (state?.success) return <Alert state={state} />;
  return (
    <form action={action} className="space-y-3">
      <Alert state={state} />
      <input type="hidden" name="orderId" value={orderId} />
      {accounts.length > 0 && <Select label="الحساب الذي حوّلت إليه" name="accountId" options={accounts.map((a) => ({ value: a.id, label: a.label }))} />}
      <Input label="رقم العملية / المرجع" name="transactionNumber" placeholder="مثال: 2024XXXXXX" />
      <ImageUploader name="receiptUrl" label="صورة الإيصال" hint="يتطلب تسجيل الدخول لرفع الصور، أو أدخل رقم العملية فقط" />
      <Button type="submit" size="sm" disabled={pending}>{pending ? "..." : "إرسال إثبات الدفع"}</Button>
    </form>
  );
}
