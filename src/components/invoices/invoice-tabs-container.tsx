"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BulkInvoiceGenerator } from "./bulk-invoice-generator"
import { InvoiceList } from "./invoice-list"

interface InvoiceTabsContainerProps {
  onStatsRefresh: () => void
}

export function InvoiceTabsContainer({ onStatsRefresh }: InvoiceTabsContainerProps) {
  const [activeTab, setActiveTab] = useState("generate")

  return (
    <div className="space-y-4">
      {/* Simple Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-200">
        <Button
          variant={activeTab === "generate" ? "default" : "ghost"}
          onClick={() => setActiveTab("generate")}
          className="rounded-b-none"
        >
          Generate Invoices
        </Button>
        <Button
          variant={activeTab === "manage" ? "default" : "ghost"}
          onClick={() => setActiveTab("manage")}
          className="rounded-b-none"
        >
          Manage Invoices
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "generate" && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Invoice Generation</CardTitle>
            <CardDescription>
              Generate invoices for multiple customers at once with professional PDF layouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkInvoiceGenerator onStatsRefresh={onStatsRefresh} />
          </CardContent>
        </Card>
      )}

      {activeTab === "manage" && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Management</CardTitle>
            <CardDescription>
              View, manage and delete existing invoices. Note: PDF files need to be deleted manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoiceList onStatsRefresh={onStatsRefresh} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}