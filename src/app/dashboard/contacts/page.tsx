'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { toast } from 'sonner'

interface Contact {
  id: string
  name: string | null
  email: string | null
  walletAddress: string | null
  user?: {
    id: string
    name: string | null
    email: string | null
    walletAddress: string | null
  } | null
  createdAt: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { authFetch } = useAuthFetch()

  // Add contact dialog
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addWallet, setAddWallet] = useState('')
  const [adding, setAdding] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Add to group state
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [invitingToGroup, setInvitingToGroup] = useState<string | null>(null)

  const fetchContacts = useCallback(async (q?: string) => {
    try {
      const url = q ? `/api/contacts?q=${encodeURIComponent(q)}` : '/api/contacts'
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts)
      }
    } catch {
      console.error('Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchContacts(search || undefined)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, fetchContacts])

  const handleAddContact = async () => {
    if (!addEmail && !addWallet) {
      toast.error('Email or wallet address is required')
      return
    }
    setAdding(true)
    try {
      const res = await authFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: addName || undefined,
          email: addEmail || undefined,
          walletAddress: addWallet || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Contact added')
      setShowAdd(false)
      setAddName('')
      setAddEmail('')
      setAddWallet('')
      fetchContacts(search || undefined)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to add contact'
      toast.error(msg)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (contactId: string) => {
    setDeletingId(contactId)
    try {
      const res = await authFetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Contact removed')
        setContacts((prev) => prev.filter((c) => c.id !== contactId))
      }
    } catch {
      toast.error('Failed to remove contact')
    } finally {
      setDeletingId(null)
    }
  }

  const openGroupPicker = async (contact: Contact) => {
    setSelectedContact(contact)
    setShowGroupPicker(true)
    setGroupsLoading(true)
    try {
      const res = await authFetch('/api/groups')
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups)
      }
    } catch {
      toast.error('Failed to load groups')
    } finally {
      setGroupsLoading(false)
    }
  }

  const inviteToGroup = async (groupId: string) => {
    if (!selectedContact) return
    const identifier = selectedContact.email || selectedContact.walletAddress
    if (!identifier) return

    setInvitingToGroup(groupId)
    try {
      const isAddress = identifier.startsWith('0x')
      const res = await authFetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        body: JSON.stringify(
          isAddress ? { walletAddress: identifier } : { email: identifier }
        ),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success(`${selectedContact.name || identifier} added to group`)
      setShowGroupPicker(false)
      setSelectedContact(null)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to invite'
      toast.error(msg)
    } finally {
      setInvitingToGroup(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold gradient-text inline-block">Contacts</h1>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl">
          Add Contact
        </Button>
      </div>

      <Input
        placeholder="Search contacts by name, email, or wallet..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-xl"
        autoComplete="off"
      />

      {contacts.length === 0 ? (
        <div className="glass rounded-2xl float-shadow p-12 text-center">
          <p className="text-muted-foreground">
            {search ? 'No contacts found.' : 'No contacts yet. Add one to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="glass rounded-2xl float-shadow hover:float-shadow-lg transition-all duration-300 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold shrink-0">
                    {(contact.name || contact.email || contact.walletAddress || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {contact.name || contact.email || contact.walletAddress}
                    </p>
                    {contact.name && contact.email && (
                      <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                    )}
                    {contact.walletAddress && (
                      <p className="text-xs text-muted-foreground/60 truncate font-mono">
                        {contact.walletAddress.slice(0, 6)}...{contact.walletAddress.slice(-4)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => openGroupPicker(contact)}
                  >
                    Add to Group
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-rose-500 h-7"
                    onClick={() => handleDelete(contact.id)}
                    disabled={deletingId === contact.id}
                  >
                    {deletingId === contact.id ? '...' : 'Remove'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add to Group Dialog */}
      <Dialog open={showGroupPicker} onOpenChange={(open) => { if (!open) { setShowGroupPicker(false); setSelectedContact(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Group</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="glass-subtle rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold shrink-0">
                {(selectedContact.name || selectedContact.email || selectedContact.walletAddress || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selectedContact.name || selectedContact.email || selectedContact.walletAddress}</p>
                {selectedContact.name && selectedContact.email && (
                  <p className="text-xs text-muted-foreground truncate">{selectedContact.email}</p>
                )}
              </div>
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {groupsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 spinner-gradient" />
              </div>
            ) : groups.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No groups found.</p>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => inviteToGroup(group.id)}
                  disabled={invitingToGroup === group.id}
                  className="w-full text-left glass-subtle rounded-xl px-4 py-3 hover:bg-foreground/5 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-between"
                >
                  <p className="font-medium text-sm">{group.name}</p>
                  {invitingToGroup === group.id && (
                    <div className="animate-spin rounded-full h-4 w-4 spinner-gradient" />
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => !open && setShowAdd(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Name (optional)"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="rounded-xl"
            />
            <Input
              placeholder="Email"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="rounded-xl"
            />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Input
              placeholder="Wallet address (0x...)"
              value={addWallet}
              onChange={(e) => setAddWallet(e.target.value)}
              className="rounded-xl font-mono text-sm"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowAdd(false)}
                disabled={adding}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={handleAddContact}
                disabled={adding || (!addEmail && !addWallet)}
              >
                {adding ? 'Adding...' : 'Add Contact'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
