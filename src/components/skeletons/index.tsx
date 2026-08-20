import React from 'react'
import { Card } from '../ui/Card'

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`shimmer-bg rounded-lg ${className}`} />
)

export const PageSkeleton = () => (
  <div className="w-full h-screen p-6 flex flex-col gap-6">
    <SkeletonBox className="w-48 h-8" />
    <SkeletonBox className="w-full h-32 rounded-2xl" />
    <SkeletonBox className="w-full h-64 rounded-2xl" />
  </div>
)

export const FarmHealthSkeleton = () => (
  <Card padding="md">
    <div className="flex items-center justify-between mb-4">
      <div className="space-y-2">
        <SkeletonBox className="w-24 h-4" />
        <SkeletonBox className="w-16 h-8" />
      </div>
      <SkeletonBox className="w-16 h-16 rounded-full" />
    </div>
    <SkeletonBox className="w-full h-4 rounded-full" />
  </Card>
)

export const FarmCardSkeleton = () => (
  <Card padding="md" className="space-y-3 border-0 shadow-sm bg-white">
    <SkeletonBox className="w-full h-32 rounded-xl" />
    <SkeletonBox className="w-3/4 h-5" />
    <SkeletonBox className="w-1/2 h-4" />
  </Card>
)

export const WeatherSkeleton = () => (
  <Card padding="md" className="overflow-hidden border-0 bg-blue-50/50">
    <div className="flex justify-between items-start mb-6">
      <div className="space-y-2">
        <SkeletonBox className="w-24 h-5" />
        <SkeletonBox className="w-40 h-8" />
      </div>
      <SkeletonBox className="w-12 h-12 rounded-full" />
    </div>
    <div className="flex gap-4">
      <SkeletonBox className="w-16 h-12 rounded-xl" />
      <SkeletonBox className="w-16 h-12 rounded-xl" />
      <SkeletonBox className="w-16 h-12 rounded-xl" />
    </div>
  </Card>
)

export const FarmSkeleton = () => (
  <Card padding="md" className="border-0 shadow-sm bg-white">
    <div className="flex items-center gap-4">
      <SkeletonBox className="w-16 h-16 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="w-32 h-5" />
        <SkeletonBox className="w-24 h-4" />
        <SkeletonBox className="w-40 h-4" />
      </div>
    </div>
  </Card>
)

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <SkeletonBox className="w-48 h-8" />
      <SkeletonBox className="w-32 h-4" />
    </div>
    <WeatherSkeleton />
    <FarmSkeleton />
    <div className="grid grid-cols-2 gap-3">
      <SkeletonBox className="w-full h-24 rounded-2xl" />
      <SkeletonBox className="w-full h-24 rounded-2xl" />
    </div>
  </div>
)

export const AIResponseSkeleton = () => (
  <div className="flex gap-3 mb-4">
    <SkeletonBox className="w-8 h-8 rounded-full shrink-0" />
    <Card padding="md" className="flex-1 border-0 shadow-sm rounded-tl-none bg-white">
      <div className="space-y-3">
        <SkeletonBox className="w-3/4 h-4" />
        <SkeletonBox className="w-full h-4" />
        <SkeletonBox className="w-5/6 h-4" />
        <div className="flex gap-2 pt-2">
          <SkeletonBox className="w-20 h-8 rounded-full" />
          <SkeletonBox className="w-24 h-8 rounded-full" />
        </div>
      </div>
    </Card>
  </div>
)

export const DiagnosisSkeleton = () => (
  <div className="space-y-4">
    <SkeletonBox className="w-full aspect-[4/3] rounded-3xl" />
    <Card padding="md" className="space-y-4">
      <SkeletonBox className="w-40 h-6" />
      <div className="space-y-2">
        <SkeletonBox className="w-full h-4" />
        <SkeletonBox className="w-5/6 h-4" />
        <SkeletonBox className="w-4/6 h-4" />
      </div>
      <SkeletonBox className="w-full h-12 rounded-xl mt-4" />
    </Card>
  </div>
)

export const InsightSkeleton = () => (
  <div className="space-y-4">
    <SkeletonBox className="w-full h-48 rounded-3xl" />
    <div className="grid grid-cols-2 gap-3">
      <SkeletonBox className="w-full h-32 rounded-2xl" />
      <SkeletonBox className="w-full h-32 rounded-2xl" />
    </div>
  </div>
)

export const HistorySkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map(i => (
      <Card key={i} padding="md" className="flex gap-4">
        <SkeletonBox className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="w-32 h-5" />
          <SkeletonBox className="w-full h-4" />
          <SkeletonBox className="w-24 h-3 mt-2" />
        </div>
      </Card>
    ))}
  </div>
)
