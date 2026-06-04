/* share.js — invite system for collaborative trip sharing */

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  doc,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

import { db } from './firebase.js';
import { getCurrentUser, getDisplayName } from './auth.js';

// ---------------------------------------------------------------------------
// Invite / join
// ---------------------------------------------------------------------------

/**
 * Looks up a trip by invite code and adds the current user as a member.
 *
 * Throws a localised Error when:
 *   - The invite code does not match any trip.
 *   - The user is not signed in.
 *
 * Silently succeeds (returns the tripId without writing) when the user is
 * already a member.
 *
 * @param {string} inviteCode  6-character code (case-insensitive)
 * @returns {Promise<string>}  the tripId
 */
export async function joinTripByCode(inviteCode) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('使用者未登入，請重新整理後再試');

    const normalised = (inviteCode || '').trim().toUpperCase();
    if (!normalised) throw new Error('請輸入邀請碼');

    const q = query(
      collection(db, 'trips'),
      where('inviteCode', '==', normalised)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('找不到此邀請碼，請確認後再試');
    }

    const tripDoc = snapshot.docs[0];
    const tripId  = tripDoc.id;
    const tripData = tripDoc.data();

    // Already a member — nothing to do.
    if (Array.isArray(tripData.members) && tripData.members.includes(user.uid)) {
      return tripId;
    }

    // Add the user to the trip's members list and record their display name.
    const displayName = getDisplayName() || '旅伴';
    await updateDoc(doc(db, 'trips', tripId), {
      members: arrayUnion(user.uid),
      [`memberNames.${user.uid}`]: displayName,
    });

    return tripId;
  } catch (e) {
    // Re-throw so callers can display the message via showToast / showConfirm.
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Sharing helpers
// ---------------------------------------------------------------------------

/**
 * Builds a shareable deep-link URL containing the invite code as a query
 * parameter.  Uses the current page's origin and pathname so the link works
 * whether the app is hosted on localhost, GitHub Pages, or a custom domain.
 *
 * @param {string} inviteCode
 * @returns {string}  full URL, e.g. https://example.com/app/?invite=ABC123
 */
export function getInviteLink(inviteCode) {
  try {
    const base = window.location.origin + window.location.pathname;
    return `${base}?invite=${encodeURIComponent((inviteCode || '').toUpperCase())}`;
  } catch (e) {
    return `?invite=${encodeURIComponent((inviteCode || '').toUpperCase())}`;
  }
}

/**
 * Copies the invite link to the system clipboard.
 * Resolves quietly on success; throws on failure so callers can show an error.
 *
 * @param {string} inviteCode
 * @returns {Promise<void>}
 */
export async function copyInviteLink(inviteCode) {
  try {
    const link = getInviteLink(inviteCode);
    await navigator.clipboard.writeText(link);
  } catch (e) {
    console.error('[share] copyInviteLink error:', e);
    throw new Error('複製失敗，請手動複製連結');
  }
}

/**
 * Opens LINE's share dialog pre-filled with the invite link.
 *
 * @param {string} inviteCode
 */
export function shareToLine(inviteCode) {
  try {
    const link = getInviteLink(inviteCode);
    const text = encodeURIComponent(`我在使用旅伴規劃行程，邀請你一起加入！\n${link}`);
    window.open(`https://line.me/R/msg/text/?${text}`, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.error('[share] shareToLine error:', e);
  }
}
