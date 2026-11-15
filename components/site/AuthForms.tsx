"use client";
import { useActionState } from "react";
import { loginAction, registerCustomerAction, registerMerchantAction } from "@/actions/auth";
import { Alert, Button, Input, Select } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Input label="البريد الإلكتروني" name="email" type="email" required />
      <Input label="كلمة المرور" name="password" type="password" required />
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "جارٍ الدخول..." : "دخول"}</Button>
    </form>
  );
}
export function CustomerSignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerCustomerAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Input label="الاسم الكامل" name="name" required />
      <Input label="البريد الإلكتروني" name="email" type="email" required />
      <Input label="رقم الهاتف" name="phone" placeholder="7xxxxxxxx" />
      <Input label="كلمة المرور" name="password" type="password" required hint="6 أحرف على الأقل" />
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "..." : "إنشاء الحساب"}</Button>
    </form>
  );
}
export function MerchantRegisterForm({ plans, categories, defaultPlan, loggedIn }: { plans: { id: number; name: string; price: string }[]; categories: { id: number; name: string }[]; defaultPlan?: number; loggedIn: boolean }) {
  const [state, action, pending] = useActionState(registerMerchantAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      {!loggedIn && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="اسم المالك" name="name" required />
          <Input label="رقم الهاتف" name="phone" />
          <Input label="البريد الإلكتروني" name="email" type="email" required />
          <Input label="كلمة المرور" name="password" type="password" required />
        </div>
      )}
      <hr className="border-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="اسم المتجر" name="storeName" required />
        <Input label="رابط المتجر (إنجليزي)" name="slug" placeholder="mystore" hint="سيصبح mystore.mscommerce.com" />
        <Input label="المدينة" name="city" placeholder="صنعاء" />
        <Select label="تصنيف المتجر" name="categoryId" options={[{ value: "", label: "اختر" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
        <Select label="الباقة" name="planId" defaultValue={defaultPlan} options={plans.map((p) => ({ value: p.id, label: `${p.name} - ${p.price}` }))} className="sm:col-span-2" />
      </div>
      <Input label="وصف المتجر" name="description" />
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "جارٍ الإنشاء..." : "إرسال طلب إنشاء المتجر"}</Button>
      <p className="text-center text-xs text-slate-400">بإرسالك الطلب فإنك توافق على الشروط والأحكام وسياسة الخصوصية.</p>
    </form>
  );
}
