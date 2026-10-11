import { router } from 'expo-router';
import { showSheet } from '../components/ActionSheet';
import { supabase } from './supabase';
import { confirm, errorMessage, notify } from './ui';

export type ReportReason = 'spam' | 'harassment' | 'hate' | 'sexual' | 'violence' | 'other';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'spam', label: 'Spam or scam' },
  { key: 'harassment', label: 'Bullying or harassment' },
  { key: 'hate', label: 'Hate speech' },
  { key: 'sexual', label: 'Sexual content' },
  { key: 'violence', label: 'Violence or threats' },
  { key: 'other', label: 'Something else' },
];

// ---------- data ----------

let blockedCache: Set<string> | null = null;

export async function getBlockedIds(): Promise<Set<string>> {
  if (blockedCache) return blockedCache;
  const { data, error } = await supabase.from('blocks').select('blocked_id');
  if (error) return new Set();
  blockedCache = new Set((data ?? []).map((r) => r.blocked_id as string));
  return blockedCache;
}

export async function blockUser(myId: string, userId: string) {
  const { error } = await supabase.from('blocks').insert({ blocker_id: myId, blocked_id: userId });
  if (error && error.code !== '23505') throw new Error(error.message);
  blockedCache?.add(userId);
}

export async function unblockUser(myId: string, userId: string) {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', userId);
  if (error) throw new Error(error.message);
  blockedCache?.delete(userId);
}

export async function isBlocked(userId: string) {
  return (await getBlockedIds()).has(userId);
}

async function fileReport(myId: string, target: { postId?: string; commentId?: string }, reason: ReportReason) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: myId,
    post_id: target.postId ?? null,
    comment_id: target.commentId ?? null,
    reason,
  });
  if (error) throw new Error(error.message);
}

export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  blockedCache = null;
}

export function clearSafetyCache() {
  blockedCache = null;
}

// ---------- flows (sheets + confirmations) ----------

/** Pick a reason, file the report, then call onDone (e.g. hide the item locally). */
export function reportFlow(myId: string, what: 'post' | 'comment', target: { postId?: string; commentId?: string }, onDone?: () => void) {
  showSheet(
    `Report this ${what}`,
    REASONS.map((r) => ({
      label: r.label,
      onPress: async () => {
        try {
          await fileReport(myId, target, r.key);
          onDone?.();
          notify('Thanks for reporting', `We'll review this ${what}. It's hidden for you in the meantime.`);
        } catch (e) {
          notify("Couldn't send the report", errorMessage(e));
        }
      },
    })),
    'Reports are private. The person won’t know you reported them.'
  );
}

export async function blockFlow(myId: string, user: { id: string; name: string }, onDone?: () => void) {
  const ok = await confirm(
    `Block ${user.name}?`,
    "You won't see their posts or comments, and you'll stop following each other. They aren't told.",
    'Block',
    true
  );
  if (!ok) return false;
  try {
    await blockUser(myId, user.id);
    onDone?.();
    return true;
  } catch (e) {
    notify("Couldn't block", errorMessage(e));
    return false;
  }
}

export async function deleteAccountFlow(signOut: () => Promise<void>) {
  const ok = await confirm(
    'Delete your account?',
    'This permanently deletes your profile, posts, comments, reactions and follows. It cannot be undone.',
    'Delete account',
    true
  );
  if (!ok) return;
  const sure = await confirm('Are you sure?', 'Your account and everything you posted will be gone for good.', 'Yes, delete it', true);
  if (!sure) return;
  try {
    await deleteMyAccount();
    await signOut();
    router.replace('/');
    notify('Account deleted', 'Your SongSnap account and posts have been removed.');
  } catch (e) {
    notify("Couldn't delete your account", errorMessage(e));
  }
}
