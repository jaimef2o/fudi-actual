import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { UserRow } from './database.types';

// ─── Phone normalisation ──────────────────────────────────────────────────────

/**
 * Normalise a phone number to E.164-ish form so that different formats
 * of the same number produce the same hash.
 *
 *   "+34 612 345 678"  → "+34612345678"
 *   "612 345 678"      → "+34612345678"  (assumes Spain if no prefix)
 *   "0034612345678"    → "+34612345678"
 */
function normalizePhone(raw: string): string {
  // Strip whitespace, dashes, dots, parens
  let phone = raw.replace(/[\s\-\.\(\)]/g, '');

  // Replace leading 00 with +
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);

  // If no country code, assume Spain (+34)
  if (!phone.startsWith('+')) {
    phone = '+34' + phone;
  }

  return phone;
}

/**
 * SHA-256 hash of a normalised phone number.
 * Never send the raw number to the backend.
 */
async function hashPhone(phone: string): Promise<string> {
  const normalised = normalizePhone(phone);
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalised
  );
}

// ─── Contact import flow ──────────────────────────────────────────────────────

export type ContactMatch = {
  contactName: string;
  user: Pick<UserRow, 'id' | 'name' | 'avatar_url' | 'handle'>;
};

/**
 * Full contact-import flow:
 * 1. Request permission
 * 2. Read contacts with phone numbers
 * 3. Hash every phone number locally
 * 4. Send hashes to Supabase to find matches
 * 5. Return matched users with contact name for display
 */
export async function importContacts(): Promise<ContactMatch[]> {
  // 1. Permission
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('PERMISSION_DENIED');
  }

  // 2. Read contacts
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
  });

  if (!data || data.length === 0) return [];

  // 3. Build hash → contactName map (one contact can have multiple numbers)
  const hashMap = new Map<string, string>();
  const hashPromises: Promise<void>[] = [];

  for (const contact of data) {
    if (!contact.phoneNumbers) continue;
    for (const pn of contact.phoneNumbers) {
      if (!pn.number) continue;
      const name = contact.name ?? contact.firstName ?? 'Contacto';
      hashPromises.push(
        hashPhone(pn.number).then((h) => {
          hashMap.set(h, name);
        })
      );
    }
  }

  await Promise.all(hashPromises);

  if (hashMap.size === 0) return [];

  // 4. Query Supabase for matching phone_hash values (batched in chunks of 100)
  const allHashes = Array.from(hashMap.keys());
  const matches: ContactMatch[] = [];

  for (let i = 0; i < allHashes.length; i += 100) {
    const chunk = allHashes.slice(i, i + 100);
    const { data: users } = await supabase
      .from('users')
      .select('id, name, avatar_url, handle, phone_hash')
      .in('phone_hash', chunk);

    if (users) {
      for (const user of users) {
        const contactName = hashMap.get(user.phone_hash ?? '') ?? user.name;
        matches.push({
          contactName,
          user: { id: user.id, name: user.name, avatar_url: user.avatar_url, handle: user.handle },
        });
      }
    }
  }

  return matches;
}

/**
 * Save the current user's phone hash so others can find them via contacts.
 * Call this after phone verification during onboarding.
 */
export async function savePhoneHash(userId: string, rawPhone: string): Promise<void> {
  const hash = await hashPhone(rawPhone);
  await supabase
    .from('users')
    .update({ phone_hash: hash })
    .eq('id', userId);
}
