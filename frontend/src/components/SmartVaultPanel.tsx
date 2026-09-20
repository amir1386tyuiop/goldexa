import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BellOff,
  Box,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/api/client";
import { getStoredAuth } from "@/auth";
import { formatPrice } from "@/utils/helpers";
import type { PriceAlert, SmartVaultAsset, SmartVaultSummary } from "@/types";

export function SmartVaultPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = getStoredAuth()?.user.id || "";
  const [targetPrice, setTargetPrice] = useState("");
  const summaryQuery = useQuery<SmartVaultSummary>({
    queryKey: ["smart-vault", "summary"],
    queryFn: api.getVaultSummary,
    enabled: Boolean(userId),
  });
  const assetsQuery = useQuery<SmartVaultAsset[]>({
    queryKey: ["smart-vault", "assets", userId],
    queryFn: () => api.getVaultAssets(userId),
    enabled: Boolean(userId),
  });
  const snapshotQueries = useQueries({
    queries: (assetsQuery.data || []).map((asset) => ({
      queryKey: ["smart-vault", "snapshots", asset.id],
      queryFn: () => api.getVaultSnapshots(asset.id),
    })),
  });
  const alertsQuery = useQuery<PriceAlert[]>({
    queryKey: ["smart-vault", "alerts", userId],
    queryFn: () => api.getVaultAlerts(userId),
    enabled: Boolean(userId),
  });
  const createAlert = useMutation({
    mutationFn: () =>
      api.createPriceAlert({
        userId,
        targetType: "gold_price",
        targetPrice: Number(targetPrice),
        triggerCondition: "greater_than_or_equal",
      }),
    onSuccess: () => {
      setTargetPrice("");
      void queryClient.invalidateQueries({
        queryKey: ["smart-vault", "alerts", userId],
      });
    },
  });
  const disableAlert = useMutation({
    mutationFn: (id: string) => api.disablePriceAlert(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["smart-vault", "alerts", userId],
      });
    },
  });
  const resetAlert = useMutation({
    mutationFn: (id: string) => api.resetPriceAlert(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["smart-vault", "alerts", userId],
      });
    },
  });
  if (summaryQuery.isLoading || assetsQuery.isLoading)
    return (
      <div
        className="card flex min-h-48 items-center justify-center gap-3"
        role="status"
      >
        <Loader2
          className="h-6 w-6 animate-spin text-amber-700"
          aria-hidden="true"
        />
        در حال دریافت خزانه هوشمند…
      </div>
    );
  if (summaryQuery.isError || assetsQuery.isError)
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-700" aria-hidden="true" />
        <p className="font-bold">دریافت دارایی‌ها ناموفق بود</p>
        <button
          type="button"
          className="btn btn-outline min-h-11 gap-2"
          onClick={() => {
            void summaryQuery.refetch();
            void assetsQuery.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          تلاش دوباره
        </button>
      </div>
    );
  const summary = summaryQuery.data || {
    assetCount: 0,
    purchaseValue: 0,
    currentValue: 0,
    goldWeight: 0,
    profitLoss: 0,
    profitLossPercent: 0,
  };
  const assets = assetsQuery.data || [];
  const snapshots = snapshotQueries.flatMap((query, index) =>
    (query.data || []).map((snapshot) => ({
      ...snapshot,
      assetName: assets[index]?.name || "دارایی",
    })),
  );
  return (
    <section className="space-y-5" aria-labelledby="smart-vault-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Box className="h-4 w-4" aria-hidden="true" />
            دارایی‌های قابل رصد
          </p>
          <h2 id="smart-vault-title" className="mt-2 text-2xl font-black">
            خزانه هوشمند
          </h2>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            ارزش خرید، ارزش فعلی و سود/زیان ثبت‌شده‌ی دارایی‌های شما.
          </p>
        </div>
        <span className="badge badge-success">{summary.assetCount} دارایی</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="ارزش فعلی"
          value={`${formatPrice(summary.currentValue)} تومان`}
        />
        <Metric
          label="ارزش خرید"
          value={`${formatPrice(summary.purchaseValue)} تومان`}
        />
        <Metric
          label="وزن طلا"
          value={`${summary.goldWeight.toLocaleString("fa-IR")} گرم`}
        />
        <Metric
          label="سود/زیان"
          value={`${summary.profitLoss >= 0 ? "+" : ""}${formatPrice(summary.profitLoss)} تومان`}
          tone={summary.profitLoss >= 0 ? "positive" : "negative"}
        />
      </div>
      {assets.length ? (
        <>
          <div className="space-y-3">
            {assets.map((asset) => (
              <article
                key={asset.id}
                className="rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-black">{asset.name}</h3>
                    <p className="mt-1 text-xs text-stone-500">
                      {asset.category || "دارایی طلا"} · {asset.weight} گرم ·
                      عیار {asset.karat}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right sm:text-left">
                    <div>
                      <p className="font-black">
                        {formatPrice(asset.currentValue)} تومان
                      </p>
                      <p
                        className={`mt-1 text-xs font-semibold ${asset.profitLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {asset.profitLoss >= 0 ? "+" : ""}
                        {formatPrice(asset.profitLoss)} (
                        {asset.profitLossPercent.toFixed(2)}٪)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline min-h-10 text-xs"
                      onClick={() =>
                        navigate(
                          `/auctions?tab=create&vaultAssetId=${encodeURIComponent(asset.id)}`,
                        )
                      }
                    >
                      ثبت در بازار دست‌دوم
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <section
            className="card p-4 sm:p-5"
            aria-labelledby="vault-history-title"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">روند ارزش‌گذاری</p>
                <h3
                  id="vault-history-title"
                  className="mt-1 text-lg font-black"
                >
                  روند همه دارایی‌ها
                </h3>
              </div>
              <span className="text-xs text-stone-500">
                بر اساس snapshotهای واقعی
              </span>
            </div>
            {snapshots.length ? (
              <div
                className="mt-4 h-64"
                role="img"
                aria-label="نمودار روند ارزش همه دارایی‌ها"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={snapshots.sort(
                      (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime(),
                    )}
                    margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
                  >
                    <XAxis
                      dataKey="createdAt"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("fa-IR")
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatPrice(Number(value))}
                      width={70}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(value, _name, item) =>
                        `${formatPrice(Number(value))} تومان · ${item.payload.assetName}`
                      }
                      labelFormatter={(value) =>
                        new Date(value).toLocaleString("fa-IR")
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="totalValue"
                      name="ارزش دارایی"
                      stroke="#b7791f"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-stone-50 p-5 text-center text-sm text-stone-500">
                هنوز snapshot کافی برای نمایش روند ثبت نشده است.
              </p>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center">
          <BarChart3
            className="mx-auto h-8 w-8 text-stone-400"
            aria-hidden="true"
          />
          <p className="mt-3 font-bold">هنوز دارایی‌ای ثبت نشده</p>
          <p className="mt-2 text-sm text-stone-600">
            پس از خرید یا ثبت دارایی، ارزش آن در خزانه نمایش داده می‌شود.
          </p>
        </div>
      )}
      <section
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
        aria-labelledby="vault-alerts-title"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-700" aria-hidden="true" />
          <h3 id="vault-alerts-title" className="font-black">
            هشدار قیمت طلای ۱۸ عیار
          </h3>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="vault-alert-price">
            قیمت هدف
          </label>
          <input
            id="vault-alert-price"
            className="input bg-white"
            inputMode="numeric"
            value={targetPrice}
            onChange={(event) =>
              setTargetPrice(event.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="قیمت هدف به تومان"
          />
          <button
            type="button"
            className="btn btn-primary min-h-11 gap-2"
            disabled={createAlert.isPending || Number(targetPrice) <= 0}
            onClick={() => createAlert.mutate()}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {createAlert.isPending ? "در حال ثبت…" : "ثبت هشدار"}
          </button>
        </div>
        {createAlert.isError ? (
          <p className="mt-2 text-xs text-red-700" role="alert">
            ثبت هشدار ناموفق بود.
          </p>
        ) : null}
        {createAlert.isSuccess ? (
          <p className="mt-2 text-xs text-emerald-700" role="status">
            هشدار قیمت ثبت شد.
          </p>
        ) : null}
        <div className="mt-3 space-y-2">
          {(alertsQuery.data || []).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"
              >
                <span>
                  وقتی قیمت به {formatPrice(alert.targetPrice)} تومان برسد
                  {alert.notifiedAt ? " · trigger شده" : ""}
                </span>
                {alert.isActive ? (
                  <button
                    type="button"
                    className="btn btn-outline min-h-9 gap-1 text-xs"
                    disabled={disableAlert.isPending}
                    onClick={() => disableAlert.mutate(alert.id)}
                  >
                    <BellOff className="h-4 w-4" aria-hidden="true" />
                    غیرفعال
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline min-h-9 gap-1 text-xs"
                    disabled={resetAlert.isPending}
                    onClick={() => resetAlert.mutate(alert.id)}
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    فعال‌سازی مجدد
                  </button>
                )}
              </div>
            ))}
        </div>
      </section>
    </section>
  );
}
function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-600">{label}</p>
      <p
        className={`mt-2 text-lg font-black ${tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-stone-950"}`}
      >
        {value}
      </p>
    </div>
  );
}
