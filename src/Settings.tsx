import React, { useState, useEffect } from "react";
import {
  FaArrowLeft,
  FaVideo,
  FaPalette,
  FaRedo,
  FaSave,
} from "react-icons/fa";

// Settings interfaces - only keeping what actually works
export interface RecordingSettings {
  defaultQuality: "low" | "medium" | "high" | "ultra";
  autoZoomEnabled: boolean;
  autoZoomSensitivity: number;
}

export interface UISettings {
  theme: "light" | "dark" | "system";
  timelineMode: "trim" | "clip";
}

export interface AppSettings {
  recording: RecordingSettings;
  ui: UISettings;
}

// Default settings
const defaultSettings: AppSettings = {
  recording: {
    defaultQuality: "high",
    autoZoomEnabled: true,
    autoZoomSensitivity: 5,
  },
  ui: {
    theme: "system",
    timelineMode: "trim",
  },
};

// Theme management utilities
const applyTheme = (theme: "light" | "dark" | "system") => {
  const html = document.documentElement;

  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.setAttribute("data-theme", isDark ? "dracula" : "winter");
  } else if (theme === "dark") {
    html.setAttribute("data-theme", "dracula");
  } else {
    html.setAttribute("data-theme", "winter");
  }
};

// Settings storage utilities
export const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem("captrix-settings", JSON.stringify(settings));
    applyTheme(settings.ui.theme);
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
};

export const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem("captrix-settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all properties exist
      const settings = {
        recording: { ...defaultSettings.recording, ...parsed.recording },
        ui: { ...defaultSettings.ui, ...parsed.ui },
      };
      applyTheme(settings.ui.theme);
      return settings;
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  applyTheme(defaultSettings.ui.theme);
  return defaultSettings;
};

export const resetSettings = () => {
  localStorage.removeItem("captrix-settings");
  applyTheme(defaultSettings.ui.theme);
  return defaultSettings;
};

type SettingsProps = {
  onBack: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
};

const Settings = ({ onBack, onSettingsChange }: SettingsProps) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [activeTab, setActiveTab] = useState<keyof AppSettings>("recording");
  const [hasChanges, setHasChanges] = useState(false);

  const tabs = [
    {
      key: "recording" as keyof AppSettings,
      label: "Recording",
      icon: FaVideo,
    },
    { key: "ui" as keyof AppSettings, label: "Interface", icon: FaPalette },
  ];

  const updateSettings = <T extends keyof AppSettings>(
    category: T,
    updates: Partial<AppSettings[T]>
  ) => {
    const newSettings = {
      ...settings,
      [category]: { ...settings[category], ...updates },
    };
    setSettings(newSettings);
    setHasChanges(true);

    // Apply theme immediately if it's changed
    if (category === "ui" && "theme" in updates) {
      applyTheme((updates as any).theme);
    }
  };

  const handleSave = () => {
    saveSettings(settings);
    onSettingsChange?.(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    const reset = resetSettings();
    setSettings(reset);
    onSettingsChange?.(reset);
    setHasChanges(false);
  };

  const renderRecordingSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="label">
          <span className="label-text font-semibold">
            Default Video Quality
          </span>
        </label>
        <select
          className="select select-bordered w-full"
          value={settings.recording.defaultQuality}
          onChange={(e) =>
            updateSettings("recording", {
              defaultQuality: e.target.value as any,
            })
          }
        >
          <option value="low">Low (720p, 1 Mbps)</option>
          <option value="medium">Medium (1080p, 3 Mbps)</option>
          <option value="high">High (1440p, 8 Mbps)</option>
          <option value="ultra">Ultra (4K, 20 Mbps)</option>
        </select>
        <div className="label">
          <span className="label-text-alt">
            Higher quality uses more storage space but provides better video
            quality
          </span>
        </div>
      </div>

      <div className="divider">Auto-Zoom Feature</div>

      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text font-semibold">
            Enable Auto-Zoom & Pan
          </span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={settings.recording.autoZoomEnabled}
            onChange={(e) =>
              updateSettings("recording", {
                autoZoomEnabled: e.target.checked,
              })
            }
          />
        </label>
        <div className="label">
          <span className="label-text-alt">
            Automatically zooms in on cursor activity during recording
          </span>
        </div>
      </div>

      {settings.recording.autoZoomEnabled && (
        <div>
          <label className="label">
            <span className="label-text font-semibold">
              Auto-Zoom Sensitivity: {settings.recording.autoZoomSensitivity}
            </span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={settings.recording.autoZoomSensitivity}
            className="range range-primary"
            onChange={(e) =>
              updateSettings("recording", {
                autoZoomSensitivity: parseInt(e.target.value),
              })
            }
          />
          <div className="w-full flex justify-between text-xs px-2">
            <span>Less Sensitive</span>
            <span>More Sensitive</span>
          </div>
          <div className="label">
            <span className="label-text-alt">
              Higher values make zoom more responsive to cursor movement
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderUISettings = () => (
    <div className="space-y-6">
      <div>
        <label className="label">
          <span className="label-text font-semibold">Theme</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={settings.ui.theme}
          onChange={(e) =>
            updateSettings("ui", { theme: e.target.value as any })
          }
        >
          <option value="light">Light Theme</option>
          <option value="dark">Dark Theme</option>
          <option value="system">Follow System Theme</option>
        </select>
        <div className="label">
          <span className="label-text-alt">
            Choose your preferred color scheme for the application
          </span>
        </div>
      </div>

      <div>
        <label className="label">
          <span className="label-text font-semibold">
            Default Timeline Mode
          </span>
        </label>
        <select
          className="select select-bordered w-full"
          value={settings.ui.timelineMode}
          onChange={(e) =>
            updateSettings("ui", { timelineMode: e.target.value as any })
          }
        >
          <option value="trim">Trim Mode</option>
          <option value="clip">Clip Mode</option>
        </select>
        <div className="label">
          <span className="label-text-alt">
            Sets the default editing mode when opening the video editor
          </span>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "recording":
        return renderRecordingSettings();
      case "ui":
        return renderUISettings();
      default:
        return null;
    }
  };

  // Apply theme on component mount to fix theme switching
  useEffect(() => {
    applyTheme(settings.ui.theme);
  }, []);

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="btn btn-ghost btn-circle" onClick={onBack}>
                <FaArrowLeft className="text-lg" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-base-content/70">
                  Customize your Captrix experience
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <span className="badge badge-warning">Unsaved changes</span>
              )}
              <button className="btn btn-outline btn-sm" onClick={handleReset}>
                <FaRedo className="mr-2" />
                Reset
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                <FaSave className="mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <ul className="menu bg-base-200 rounded-lg p-2">
              {tabs.map((tab) => (
                <li key={tab.key}>
                  <a
                    className={`flex items-center space-x-3 ${
                      activeTab === tab.key ? "active" : ""
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <tab.icon className="text-lg" />
                    <span>{tab.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-base-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6">
                {tabs.find((tab) => tab.key === activeTab)?.label} Settings
              </h2>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
