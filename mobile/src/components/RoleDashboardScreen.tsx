import React, { useCallback, useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { getAuth, mobileApi } from './api'
import { Header, Metric, Screen, Section, State, styles } from './ui'

type Role = 'seller' | 'designer' | 'expert'
export default function RoleDashboardScreen({ role }: { role: Role }) {
  const [data, setData] = useState<unknown[] | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => { setLoading(true); setError(null); try { const result = role === 'seller' ? await mobileApi.sellers() : role === 'designer' ? await mobileApi.designs() : await mobileApi.auctions(); setData(result as unknown[]) } catch (e) { setError(e instanceof Error ? e.message : 'دریافت اطلاعات ناموفق بود') } finally { setLoading(false) } }, [role])
  useEffect(() => { load() }, [load])
  const titles = { seller: ['داشبورد فروشنده', 'مدیریت فروشگاه و سفارش‌ها'], designer: ['استودیو طراح', 'طرح‌ها و سفارش‌های سفارشی'], expert: ['داشبورد کارشناس', 'بررسی کیفیت و مزایده‌ها'] }
  return <Screen><Header title={titles[role][0]} subtitle={titles[role][1]} /><View style={styles.row}><Metric label="نقش فعال" value={role === 'seller' ? 'فروشنده' : role === 'designer' ? 'طراح' : 'کارشناس'} tone={colors.gold} /><Metric label="دسترسی" value="تأییدشده" tone={colors.success} /></View><Section title={role === 'seller' ? 'فروشگاه‌های متصل' : role === 'designer' ? 'طرح‌های ثبت‌شده' : 'مزایده‌های فعال'}><State loading={loading} error={error} empty={!loading && !error && !data?.length} onRetry={load} />{data?.slice(0, 10).map((item: any, index) => <View key={String(item.id || index)} style={styles.card}><Text style={styles.heading}>{item.storeName || item.name || item.product?.name || 'رکورد بدون عنوان'}</Text><Text style={[styles.muted, { marginTop: 6 }]}>{item.status || (item.isVerified ? 'تأیید شده' : 'در انتظار بررسی')}</Text></View>)}</Section><Pressable style={styles.button} onPress={load} accessibilityRole="button" accessibilityLabel="به‌روزرسانی داشبورد"><Text style={styles.buttonText}>به‌روزرسانی</Text></Pressable></Screen>
}
const colors = { gold: '#A16207', success: '#166534' }

