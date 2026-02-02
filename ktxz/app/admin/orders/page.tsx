/**
 * ============================================================================
 * FILE: app/admin/orders/page.tsx
 * STATUS: NEW FILE
 * ============================================================================
 * 
 * Admin Orders List Page
 * - Dashboard with order statistics
 * - Filtering (status, search, date range)
 * - Pagination (20 per page)
 * - CSV export
 * - Links to individual order details
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Order {
  _id: string;
  orderNumber: string;
  email: string;
  items: Array<{ quantity: number }>;
  amounts: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
  status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
  shippingAddress?: {
    name?: string;
  };
  createdAt: string;
}

type StatusFilter = "all" | "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  paid: "bg-blue-100 text-blue-800 border-blue-200",
  fulfilled: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  refunded: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_BADGES = {
  pending: "⏳",
  paid: "💳",
  fulfilled: "✅",
  cancelled: "❌",
  refunded: "💸",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    fulfilled: 0,
    cancelled: 0,
    refunded: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [orders, statusFilter, searchQuery, dateFrom, dateTo]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/orders");
      
      if (!response.ok) throw new Error("Failed to fetch orders");
      
      const data = await response.json();
      setOrders(data.orders || []);
      calculateStats(data.orders || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orderList: Order[]) => {
    const newStats = {
      total: orderList.length,
      pending: 0,
      paid: 0,
      fulfilled: 0,
      cancelled: 0,
      refunded: 0,
      totalRevenue: 0,
    };

    orderList.forEach((order) => {
      newStats[order.status]++;
      if (order.status === "paid" || order.status === "fulfilled") {
        newStats.totalRevenue += order.amounts.total;
      }
    });

    setStats(newStats);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...orders];

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.email.toLowerCase().includes(query) ||
          order.shippingAddress?.name?.toLowerCase().includes(query)
      );
    }

    if (dateFrom) {
      filtered = filtered.filter(
        (order) => new Date(order.createdAt) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(
        (order) => new Date(order.createdAt) <= new Date(dateTo)
      );
    }

    filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const exportOrders = () => {
    const csv = [
      ["Order Number", "Date", "Email", "Status", "Items", "Total"].join(","),
      ...filteredOrders.map((order) =>
        [
          order.orderNumber,
          new Date(order.createdAt).toLocaleDateString(),
          order.email,
          order.status,
          order.items.length,
          `$${(order.amounts.total / 100).toFixed(2)}`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and track all customer orders</p>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            ← Back to Admin
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">To Fulfill</p>
                <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
              </div>
              <div className="text-3xl">📋</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(stats.totalRevenue / 100).toFixed(2)}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Order #, email, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
              <span className="text-sm text-gray-500">
                Showing {filteredOrders.length} of {orders.length} orders
              </span>
            </div>
            
            <button
              onClick={exportOrders}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📊 Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                currentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.shippingAddress?.name || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">{order.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.items.length} item(s)</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ${(order.amounts.total / 100).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status]}`}>
                        <span>{STATUS_BADGES[order.status]}</span>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t">
              <div>
                <p className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}
                </p>
              </div>
              <div>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-l text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded-r text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}