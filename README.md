# Captrix - Your Open-Source Screen Studio

Captrix is a free, open-source, cross-platform alternative to Screen.studio. Our goal is to create a powerful screen recorder that makes it easy to create beautiful, polished videos with smart, automatic editing features.

This document outlines our development roadmap. We'll be building the following features step-by-step on our way to the first official launch.

---

## Feature Roadmap

### Phase 1: Core Recording Engine (The MVP)

This phase focuses on the absolute basics of a screen recorder.

1.  **Screen Capture**:

    - Let the user select which display to record.
    - Let the user select a specific application window to record.
    - Basic controls: Start, Pause, and Stop recording.
    - Save the final recording to a file (e.g., MP4).

2.  **Audio Recording**:

    - Capture system audio (what the computer is playing).
    - Capture audio from a selected microphone.
    - Allow the user to mix or choose between system and microphone audio.

3.  **Basic User Interface**:
    - A main window with recording controls.
    - A preview of what is being recorded (or the selected screen/window).
    - A settings page to configure things like video quality, frame rate, and where to save recordings.

### Phase 2: Enhancing the Recording

This phase adds visual flair to the raw recording, getting closer to the polished look of Screen.studio.

4.  **Cursor and Interaction Highlighting**:

    - Add a visual highlight around the mouse cursor to make it easy to follow.
    - Create an animation or ripple effect when the user clicks the mouse.
    - Allow customization of cursor effects (color, size, etc.).

5.  **Webcam Overlay**:
    - Record from the user's webcam at the same time as the screen.
    - Display the webcam feed as an overlay on the screen recording.
    - Allow the user to change the shape (e.g., circle, rectangle), size, and position of the webcam overlay.

### Phase 3: The "Studio" - Post-Processing and Effects

This is where the magic happens. These features are what set Screen.studio apart and would be the most complex to implement. They would likely operate on the video _after_ the recording is finished.

6.  **Automatic Pan & Zoom**:

    - Analyze the cursor's position in the recording and automatically create smooth panning and zooming motions to keep the cursor centered and in focus. The "smoothness" is key here.

7.  **Video Effects**:

    - **Automatic Motion Blur**: Add motion blur to fast-moving elements, especially the pan-and-zoom transitions, for a cinematic feel.
    - **Wallpaper/Backgrounds**: Allow the user to add a custom wallpaper or background behind their screen recording.
    - **Shadows & Borders**: Add visually appealing shadows and rounded borders to the recording window.

8.  **Simple Video Editor**:
    - A timeline view of the recorded video.
    - Tools for basic trimming and cutting of the video.
    - Ability to manually tweak the automatic pan & zoom points.

### Phase 4: Final Touches and Usability

9.  **Advanced Export Options**:

    - Export videos in different formats (e.g., MP4, WebM, GIF).
    - Allow users to choose resolution, quality, and frame rate for the final export.

10. **Project Management**:
    - Save the editing session (including cuts, effects, and pan/zoom data) as a project file so it can be re-edited later.
