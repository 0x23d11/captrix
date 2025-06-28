import React, { useEffect, useState } from "react";
import {
  FaDownload,
  FaRedo,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "error"
  | "not-available";

interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

const UpdateNotification: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Set up event listeners
    const electronAPI = (window as any).electronAPI;
    const unsubscribers = [
      electronAPI.onUpdaterChecking(() => {
        setStatus("checking");
        setShowNotification(true);
      }),

      electronAPI.onUpdaterUpdateAvailable((info: any) => {
        setStatus("available");
        setUpdateInfo(info);
        setShowNotification(true);
      }),

      electronAPI.onUpdaterUpdateNotAvailable(() => {
        setStatus("not-available");
        setTimeout(() => setShowNotification(false), 3000);
      }),

      electronAPI.onUpdaterError((error: string) => {
        setStatus("error");
        setError(error);
        setShowNotification(true);
      }),

      electronAPI.onUpdaterDownloadProgress((progressObj: any) => {
        setStatus("downloading");
        setProgress(progressObj);
        setShowNotification(true);
      }),

      electronAPI.onUpdaterUpdateDownloaded((info: any) => {
        setStatus("downloaded");
        setUpdateInfo(info);
        setShowNotification(true);
      }),
    ];

    // Cleanup listeners on unmount
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  const handleDownload = async () => {
    try {
      await (window as any).electronAPI.downloadUpdate();
    } catch (err) {
      console.error("Failed to download update:", err);
    }
  };

  const handleInstall = () => {
    (window as any).electronAPI.quitAndInstall();
  };

  const handleCheckForUpdates = async () => {
    try {
      await (window as any).electronAPI.checkForUpdates();
    } catch (err) {
      console.error("Failed to check for updates:", err);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification) {
    return null;
  }

  const renderContent = () => {
    switch (status) {
      case "checking":
        return (
          <div className="flex items-center space-x-3">
            <FaRedo className="animate-spin text-info" />
            <span>Checking for updates...</span>
          </div>
        );

      case "available":
        return (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <FaDownload className="text-success" />
              <span>Update available: v{updateInfo?.version}</span>
            </div>
            <div className="flex space-x-2">
              <button
                className="btn btn-sm btn-success"
                onClick={handleDownload}
              >
                Download
              </button>
              <button className="btn btn-sm btn-ghost" onClick={handleDismiss}>
                Later
              </button>
            </div>
          </div>
        );

      case "downloading":
        return (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <FaDownload className="text-info animate-pulse" />
              <span>
                Downloading update... {Math.round(progress?.percent || 0)}%
              </span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-2">
              <div
                className="bg-info h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress?.percent || 0}%` }}
              ></div>
            </div>
            {progress && (
              <div className="text-xs text-base-content/60">
                {(progress.transferred / 1024 / 1024).toFixed(1)}MB /{" "}
                {(progress.total / 1024 / 1024).toFixed(1)}MB
                {" • "}
                {(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s
              </div>
            )}
          </div>
        );

      case "downloaded":
        return (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <FaCheck className="text-success" />
              <span>Update ready to install</span>
            </div>
            <div className="flex space-x-2">
              <button
                className="btn btn-sm btn-success"
                onClick={handleInstall}
              >
                Restart & Install
              </button>
              <button className="btn btn-sm btn-ghost" onClick={handleDismiss}>
                Install Later
              </button>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <FaExclamationTriangle className="text-error" />
              <span>Update failed</span>
            </div>
            <div className="text-xs text-base-content/60 max-w-xs">{error}</div>
            <div className="flex space-x-2">
              <button
                className="btn btn-sm btn-outline"
                onClick={handleCheckForUpdates}
              >
                Retry
              </button>
              <button className="btn btn-sm btn-ghost" onClick={handleDismiss}>
                Dismiss
              </button>
            </div>
          </div>
        );

      case "not-available":
        return (
          <div className="flex items-center space-x-3">
            <FaCheck className="text-success" />
            <span>You're up to date!</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="alert bg-base-200/95 backdrop-blur-sm border border-base-300 shadow-lg">
        <div className="flex-1">{renderContent()}</div>
        {status !== "downloading" && status !== "checking" && (
          <button className="btn btn-ghost btn-xs" onClick={handleDismiss}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default UpdateNotification;
