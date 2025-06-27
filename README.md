# Captrix - Offline Screen Recorder

Captrix is a desktop screen recording application built with Electron, React, and TypeScript. It is inspired by the features and design of Screen Studio and [Cap](https://github.com/CapSoftware/Cap) and is designed to work completely offline.

## Tech Stack

- **Electron** for the desktop application framework.
- **React** for the user interface.
- **TypeScript** for type-safe JavaScript.
- **Vite** for the build tool.

## Features Roadmap

Here is a step-by-step plan for the features we will build:

### Phase 1: Core Recording Functionality

1.  **Setup React & TypeScript**: Integrate React into the Electron renderer process.
2.  **Basic UI Shell**: Create the main application window and layout with placeholders for controls and video preview.
3.  **Screen Source Selection**: Allow the user to select what to record: the entire screen, a specific application window.
4.  **Recording Controls**: Implement Start, Stop, and Pause/Resume functionality for recording.
5.  **Video Preview**: Display the recorded video in the application.

### Phase 2: Recording Enhancements

6.  **Audio Recording**: Add the ability to capture audio from the system and/or a microphone.
7.  **Webcam Overlay**: Allow recording from the webcam and display it as an overlay on the screen recording.
8.  **Auto-Zoom & Pan**: Automatically follow and zoom in on the cursor or active window.
9.  **Cursor Highlighting**: Add visual effects to the mouse cursor to make it stand out.

### Phase 3: Post-Recording Video Editor

10. **Video Trimming and Clipping**: Implement basic video editing to trim the start and end of recordings.
11. **Background Styling**: Add padding, blur, or custom image backgrounds to the video.
12. **Video Annotations**: Add text, shapes, and other annotations on top of the recorded video.
13. **Export Options**: Allow users to save recordings in different formats (e.g., MP4, WebM, GIF).

### Phase 4: Application Polish

14. **Recording Gallery**: Create a view to browse, preview, and manage past recordings.
15. **Settings Page**: Add a settings page for configuring video quality, frame rate, default save location, and other preferences.
16. **UI/UX Polish**: Refine the user interface and experience to match the design of Cap.
17. **Keyboard Shortcuts**: Implement global keyboard shortcuts for starting/stopping recordings.
18. **Offline First**: Ensure all features work without an internet connection.

---

This roadmap will guide our development process. Let's get started!
