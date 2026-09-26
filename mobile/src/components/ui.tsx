import React from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const colors = { bg: '#FAFAF9', ink: '#1C1917', muted: '#78716C', gold: '#A16207', goldSoft: '#FEF3C7', card: '#FFFFFF', border: '#E7E5E4', danger: '#B91C1C', success: '#166534' }
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 48 },
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  body: { color: colors.ink, fontSize: 14, lineHeight: 23, textAlign: 'right', writingDirection: 'rtl' },
  muted: { color: colors.muted, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.ink },
  buttonText: { color: '#FFF', fontWeight: '800', fontSize: 15, textAlign: 'center', writingDirection: 'rtl' },
  input: { minHeight: 52, backgroundColor: '#FFF', borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, color: colors.ink, fontSize: 16, textAlign: 'right', writingDirection: 'rtl' },
})

export function Screen({ children }: { children: React.ReactNode }) { return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView> }
export function Header({ title, subtitle }: { title: string; subtitle?: string }) { return <View style={{ marginBottom: 24 }}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={[styles.muted, { marginTop: 6 }]}>{subtitle}</Text> : null}</View> }
export function State({ loading, error, empty, onRetry }: { loading?: boolean; error?: string | null; empty?: boolean; onRetry?: () => void }) { if (loading) return <View style={styles.card}><ActivityIndicator color={colors.gold} /><Text style={[styles.muted, { marginTop: 10, textAlign: 'center' }]}>در حال دریافت اطلاعات…</Text></View>; if (error) return <View style={[styles.card, { borderColor: '#FECACA' }]}><Text style={[styles.body, { color: colors.danger }]}>{error}</Text>{onRetry ? <Pressable onPress={onRetry} style={[styles.button, { backgroundColor: colors.gold, marginTop: 14 }]} accessibilityRole="button" accessibilityLabel="تلاش دوباره"><Text style={styles.buttonText}>تلاش دوباره</Text></Pressable> : null}</View>; if (empty) return <View style={styles.card}><Text style={[styles.body, { textAlign: 'center' }]}>هنوز داده‌ای برای نمایش وجود ندارد.</Text></View>; return null }
export function Metric({ label, value, tone = colors.ink }: { label: string; value: string; tone?: string }) { return <View style={[styles.card, { flex: 1, marginHorizontal: 4 }]}><Text style={[styles.heading, { color: tone, fontSize: 21 }]}>{value}</Text><Text style={[styles.muted, { marginTop: 5 }]}>{label}</Text></View> }
export function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={{ marginTop: 10, marginBottom: 16 }}><Text style={[styles.heading, { marginBottom: 12 }]}>{title}</Text>{children}</View> }
export function ProductCard({ item }: { item: { name: string; finalPrice: number; weight: number; images?: string[]; sellerName?: string } }) { return <View style={styles.card}>{item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={{ height: 150, borderRadius: 12, marginBottom: 12 }} resizeMode="cover" accessibilityLabel={item.name} /> : <View style={{ height: 72, borderRadius: 12, backgroundColor: colors.goldSoft, marginBottom: 12 }} /> }<Text style={styles.heading}>{item.name}</Text><Text style={[styles.muted, { marginTop: 5 }]}>{item.weight} گرم {item.sellerName ? ` · ${item.sellerName}` : ''}</Text><Text style={[styles.heading, { color: colors.gold, marginTop: 10 }]}>{item.finalPrice.toLocaleString('fa-IR')} تومان</Text></View> }
export function DataRow({ label, value, status }: { label: string; value: string; status?: string }) { return <View style={[styles.row, { justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }]}><Text style={styles.body}>{value}</Text><View><Text style={styles.body}>{label}</Text>{status ? <Text style={[styles.muted, { marginTop: 3 }]}>{status}</Text> : null}</View></View> }
export function LabeledInput({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={{ marginBottom: 14 }}><Text style={[styles.body, { fontWeight: '700', marginBottom: 7 }]}>{label}</Text><TextInput {...props} style={[styles.input, props.style]} accessible accessibilityLabel={label} /></View> }

