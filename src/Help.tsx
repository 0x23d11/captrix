import React from "react";
import {
  FaArrowLeft,
  FaQuestionCircle,
  FaKeyboard,
  FaDesktop,
  FaWindowMaximize,
  FaPlay,
  FaPause,
  FaStop,
  FaEdit,
  FaExternalLinkAlt,
} from "react-icons/fa";

type HelpProps = {
  onBack: () => void;
};

const Help = ({ onBack }: HelpProps) => {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <button className="btn btn-ghost btn-circle" onClick={onBack}>
              <FaArrowLeft className="text-lg" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <FaQuestionCircle className="mr-3 text-primary" />
                Help & Documentation
              </h1>
              <p className="text-base-content/70">
                Learn how to get the most out of Captrix
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Getting Started */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FaPlay className="mr-2 text-primary" />
              Getting Started
            </h3>
            <div className="space-y-4 text-sm">
              <div className="alert alert-info">
                <FaDesktop className="text-lg" />
                <div>
                  <h4 className="font-medium">How to Record Your Screen</h4>
                  <p>
                    1. Choose "Entire Screen" to capture everything or "App
                    Window" for specific applications
                  </p>
                  <p>2. Select your preferred quality in Recording settings</p>
                  <p>3. Click the record button to start capturing</p>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FaKeyboard className="mr-2 text-secondary" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Recording Controls</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Start/Stop Recording</span>
                    <kbd className="kbd kbd-sm">Space</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Pause/Resume</span>
                    <kbd className="kbd kbd-sm">P</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancel Recording</span>
                    <kbd className="kbd kbd-sm">Esc</kbd>
                  </div>
                </div>
              </div>
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Navigation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Open Settings</span>
                    <kbd className="kbd kbd-sm">Cmd</kbd> +{" "}
                    <kbd className="kbd kbd-sm">,</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Go Back</span>
                    <kbd className="kbd kbd-sm">Esc</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Save Recording</span>
                    <kbd className="kbd kbd-sm">Cmd</kbd> +{" "}
                    <kbd className="kbd kbd-sm">S</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Guide */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FaEdit className="mr-2 text-accent" />
              Features Guide
            </h3>
            <div className="space-y-4">
              <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="help-accordion" defaultChecked />
                <div className="collapse-title text-md font-medium">
                  Auto-Zoom & Pan Feature
                </div>
                <div className="collapse-content text-sm">
                  <p className="mb-2">
                    Automatically follows your cursor and zooms in on active
                    areas during recording.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-base-content/70">
                    <li>
                      Enable in Recording settings for automatic cursor tracking
                    </li>
                    <li>
                      Adjust sensitivity to control how responsive the zoom is
                    </li>
                    <li>
                      Works best for software tutorials and demonstrations
                    </li>
                    <li>Can be turned off for static content recording</li>
                  </ul>
                </div>
              </div>

              <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="help-accordion" />
                <div className="collapse-title text-md font-medium">
                  Video Quality Settings
                </div>
                <div className="collapse-content text-sm">
                  <p className="mb-2">
                    Choose the right encoding quality for your needs:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-base-content/70">
                    <li>
                      <strong>Low (1 Mbps):</strong> Smaller file size, good for
                      quick demos
                    </li>
                    <li>
                      <strong>Medium (3 Mbps):</strong> Balanced quality and
                      file size
                    </li>
                    <li>
                      <strong>High (8 Mbps):</strong> Crisp quality for
                      professional content
                    </li>
                    <li>
                      <strong>Ultra (20 Mbps):</strong> Maximum quality, large
                      file sizes
                    </li>
                  </ul>
                  <p className="mt-2 text-base-content/60">
                    <strong>Note:</strong> Video resolution always matches your
                    screen resolution. These settings only control the encoding
                    bitrate and compression quality.
                  </p>
                </div>
              </div>

              <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="help-accordion" />
                <div className="collapse-title text-md font-medium">
                  Timeline Editor Modes
                </div>
                <div className="collapse-content text-sm">
                  <p className="mb-2">Two editing modes available:</p>
                  <ul className="list-disc list-inside space-y-1 text-base-content/70">
                    <li>
                      <strong>Trim Mode:</strong> Cut from beginning and end of
                      video
                    </li>
                    <li>
                      <strong>Clip Mode:</strong> Create multiple clips from
                      your recording
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FaQuestionCircle className="mr-2 text-warning" />
              Troubleshooting
            </h3>
            <div className="space-y-4">
              <div className="alert">
                <FaDesktop />
                <div>
                  <h4 className="font-medium">Can't see screen sources?</h4>
                  <p className="text-sm">
                    Make sure Captrix has screen recording permissions in System
                    Preferences → Privacy & Security → Screen Recording
                  </p>
                </div>
              </div>

              <div className="alert">
                <FaWindowMaximize />
                <div>
                  <h4 className="font-medium">Recording appears choppy?</h4>
                  <p className="text-sm">
                    Try lowering the video quality setting or closing other
                    applications to free up system resources
                  </p>
                </div>
              </div>

              <div className="alert">
                <FaStop />
                <div>
                  <h4 className="font-medium">Recording stops unexpectedly?</h4>
                  <p className="text-sm">
                    Check available disk space and ensure your system isn't
                    going to sleep during recording
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Tips */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FaPlay className="mr-2 text-success" />
              Performance Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Before Recording</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-base-content/70">
                  <li>Close unnecessary applications</li>
                  <li>Check available disk space</li>
                  <li>Ensure stable power connection</li>
                  <li>Disable system notifications</li>
                </ul>
              </div>
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">During Recording</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-base-content/70">
                  <li>Avoid rapid window switching</li>
                  <li>Keep movements smooth and deliberate</li>
                  <li>Monitor system performance</li>
                  <li>Use auto-zoom for better focus</li>
                </ul>
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-lg font-semibold mb-4">About Captrix</h3>
            <div className="bg-base-200 rounded-lg p-6">
              <p className="text-sm mb-4">
                Captrix is a professional offline screen recording application
                built with Electron, React, and TypeScript. Inspired by Screen
                Studio and Cap, it offers advanced recording features with
                complete offline functionality.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge badge-outline">Version 1.0.0</span>
                <span className="badge badge-outline">Offline First</span>
                <span className="badge badge-outline">Cross Platform</span>
                <span className="badge badge-outline">Open Source</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://github.com/yourusername/captrix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  <FaExternalLinkAlt className="mr-1" />
                  GitHub
                </a>
                <a
                  href="https://github.com/yourusername/captrix/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  <FaQuestionCircle className="mr-1" />
                  Report Issue
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
