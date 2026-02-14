import { CreateGroupForm } from '@/components/groups/create-group-form'

export default function NewGroupPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text inline-block">Create Group</h1>
      <CreateGroupForm />
    </div>
  )
}
