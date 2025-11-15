"use client";

import { useEffect, useState } from "react";
import { successToast, errorAlert } from "@/components/swal";

interface CollectionStatus {
  collection: string;
  status: string;
  message: string;
  created?: boolean;
  indexesCreated?: string[];
  error?: string;
}

interface FieldValidation {
  collection: string;
  totalDocuments: number;
  missingFields: Array<{
    fieldName: string;
    missingCount: number;
    percentage: number;
  }>;
  validationStatus: "ok" | "needs-migration";
}

interface InitResponse {
  status: string;
  message: string;
  timestamp: string;
  collections: CollectionStatus[];
  summary: {
    total: number;
    created: number;
    existing: number;
    errors: number;
  };
}

interface ValidationResponse {
  status: string;
  message: string;
  timestamp: string;
  collections: FieldValidation[];
  summary: {
    totalCollectionsChecked: number;
    collectionsWithIssues: number;
    totalMissingFieldInstances: number;
  };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"collections" | "fields">(
    "collections"
  );
  const [initData, setInitData] = useState<InitResponse | null>(null);
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const handleCheckCollections = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/db-init");
      if (res.ok) {
        const data = await res.json();
        setInitData(data);
        setLastUpdated(new Date().toLocaleTimeString());
        await successToast("Collections checked successfully");
      } else {
        await errorAlert("Error", "Failed to check collections");
      }
    } catch (err) {
      console.error("Error:", err);
      await errorAlert("Error", "Failed to check collections");
    } finally {
      setLoading(false);
    }
  };

  const handleValidateFields = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/validate-fields");
      if (res.ok) {
        const data = await res.json();
        setValidationData(data);
        setLastUpdated(new Date().toLocaleTimeString());
        await successToast("Fields validated successfully");
      } else {
        await errorAlert("Error", "Failed to validate fields");
      }
    } catch (err) {
      console.error("Error:", err);
      await errorAlert("Error", "Failed to validate fields");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCheckCollections();
    handleValidateFields();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🔧 Admin Dashboard - Database Status
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor database collections and field integrity
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={handleCheckCollections}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Checking..." : "🔄 Check Collections"}
          </button>
          <button
            onClick={handleValidateFields}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Validating..." : "✓ Validate Fields"}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-gray-300">
          {(["collections", "fields"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium border-b-2 transition ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "collections" ? "📦 Collections" : "📋 Fields"}
            </button>
          ))}
        </div>

        {/* Collections Tab */}
        {activeTab === "collections" && initData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Total Collections</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {initData.summary.total}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Created</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {initData.summary.created}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Existing</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {initData.summary.existing}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Errors</p>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    initData.summary.errors > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {initData.summary.errors}
                </p>
              </div>
            </div>

            {/* Collections Details */}
            {initData.collections.map((collection) => (
              <div
                key={collection.collection}
                className={`p-6 rounded-lg border ${
                  collection.status === "error"
                    ? "bg-red-50 border-red-300"
                    : collection.status === "created"
                    ? "bg-green-50 border-green-300"
                    : "bg-blue-50 border-blue-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className={`text-lg font-semibold ${
                      collection.status === "error"
                        ? "text-red-900"
                        : collection.status === "created"
                        ? "text-green-900"
                        : "text-blue-900"
                    }`}
                  >
                    {collection.collection}
                    {collection.status === "created" && "✅"}
                    {collection.status === "exists" && "✓"}
                    {collection.status === "error" && "❌"}
                  </h3>
                  <span
                    className={`text-xs px-3 py-1 rounded font-medium ${
                      collection.status === "error"
                        ? "bg-red-200 text-red-800"
                        : collection.status === "created"
                        ? "bg-green-200 text-green-800"
                        : "bg-blue-200 text-blue-800"
                    }`}
                  >
                    {collection.status}
                  </span>
                </div>

                <p
                  className={`text-sm ${
                    collection.status === "error"
                      ? "text-red-700"
                      : collection.status === "created"
                      ? "text-green-700"
                      : "text-blue-700"
                  }`}
                >
                  {collection.message}
                </p>

                {collection.indexesCreated && collection.indexesCreated.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-2">Indexes Created:</p>
                    <div className="flex flex-wrap gap-2">
                      {collection.indexesCreated.map((index) => (
                        <span
                          key={index}
                          className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded"
                        >
                          {index}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {collection.error && (
                  <p className="text-sm text-red-700 mt-2">Error: {collection.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fields Tab */}
        {activeTab === "fields" && validationData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Collections Checked</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {validationData.summary.totalCollectionsChecked}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-600 text-sm">With Issues</p>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    validationData.summary.collectionsWithIssues > 0
                      ? "text-orange-600"
                      : "text-green-600"
                  }`}
                >
                  {validationData.summary.collectionsWithIssues}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Missing Field Instances</p>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    validationData.summary.totalMissingFieldInstances > 0
                      ? "text-orange-600"
                      : "text-green-600"
                  }`}
                >
                  {validationData.summary.totalMissingFieldInstances}
                </p>
              </div>
            </div>

            {/* Field Details */}
            {validationData.collections.map((collection) => (
              <div
                key={collection.collection}
                className={`p-6 rounded-lg border ${
                  collection.validationStatus === "needs-migration"
                    ? "bg-orange-50 border-orange-300"
                    : "bg-green-50 border-green-300"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3
                    className={`text-lg font-semibold ${
                      collection.validationStatus === "needs-migration"
                        ? "text-orange-900"
                        : "text-green-900"
                    }`}
                  >
                    {collection.collection}
                    {collection.validationStatus === "ok" && "✓"}
                    {collection.validationStatus === "needs-migration" && "⚠️"}
                  </h3>
                  <span
                    className={`text-xs px-3 py-1 rounded font-medium ${
                      collection.validationStatus === "needs-migration"
                        ? "bg-orange-200 text-orange-800"
                        : "bg-green-200 text-green-800"
                    }`}
                  >
                    {collection.totalDocuments} documents
                  </span>
                </div>

                {collection.missingFields.length === 0 ? (
                  <p
                    className={`text-sm ${
                      collection.validationStatus === "ok"
                        ? "text-green-700"
                        : "text-orange-700"
                    }`}
                  >
                    All required fields are present ✓
                  </p>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-2">Missing Fields:</p>
                    <div className="space-y-2">
                      {collection.missingFields.map((field) => (
                        <div
                          key={field.fieldName}
                          className="flex items-center justify-between text-sm bg-white bg-opacity-50 p-2 rounded"
                        >
                          <span className="font-medium">{field.fieldName}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  field.percentage > 50
                                    ? "bg-red-500"
                                    : field.percentage > 25
                                    ? "bg-orange-500"
                                    : "bg-yellow-500"
                                }`}
                                style={{ width: `${field.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">
                              {field.missingCount}/{collection.totalDocuments}{" "}
                              ({field.percentage}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-300 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Database Status Guide</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              <strong>Collections Tab:</strong> Shows which collections exist and have
              been created with proper indexes
            </li>
            <li>
              <strong>Fields Tab:</strong> Validates that all required fields exist in
              documents
            </li>
            <li>
              <strong>Green Status:</strong> All systems healthy, no action needed
            </li>
            <li>
              <strong>Orange Status:</strong> Some optional fields are missing, but
              required fields are present
            </li>
            <li>
              <strong>Red Status:</strong> Critical issues need immediate attention
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
