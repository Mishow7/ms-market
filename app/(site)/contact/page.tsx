import { contactAction } from "@/actions/auth";
import { ActionForm } from "@/components/ui/client";
import { Input, Textarea } from "@/components/ui";

export default function Contact() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-black">تواصل معنا</h1>
      <p className="mt-2 text-slate-500">فريق الدعم جاهز لمساعدتك.</p>
      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow">
        <ActionForm action={contactAction} submitLabel="إرسال" resetOnSuccess>
          <Input label="الاسم" name="name" required />
          <Input label="البريد الإلكتروني" name="email" type="email" required />
          <Input label="الموضوع" name="subject" />
          <Textarea label="الرسالة" name="message" rows={5} />
        </ActionForm>
      </div>
    </div>
  );
}
