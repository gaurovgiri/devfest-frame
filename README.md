# DevFest 2024 - Profile Frame Creator

This project is a web application that allows users to create personalized profile frames for DevFest 2024. Users can upload their images, select a frame type (participant or organizer), adjust the frame, and download the final image.

## Features

- Upload images in JPEG or PNG format
- Select between participant and organizer frames
- Crop and adjust the uploaded image
- Download the final framed image

## Project Structure

```
.
├── .gitignore
├── api/
│   └── index.py
├── README.md
├── requirements.txt
├── run.sh
├── static/
│   ├── fonts/
│   │   ├── Product Sans Bold Italic.ttf
│   │   ├── Product Sans Bold.ttf
│   │   ├── Product Sans Italic.ttf
│   │   └── Product Sans Regular.ttf
│   ├── images/
│   ├── script.js
│   └── style.css
├── templates/
│   └── index.html
├── utils.py
└── vercel.json
```

## Installation

1. Clone the repository:
    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. Create a virtual environment and activate it:
    ```sh
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3. Install the dependencies:
    ```sh
    pip install -r requirements.txt
    ```

## Running the Application

To run the application locally, execute the following command:
```sh
sh run.sh
```

The application will be available at `http://127.0.0.1:5000`.

## Deployment

This project is configured to be deployed on Vercel. The configuration is specified in the `vercel.json` file.

## Usage

1. Open the application in your web browser.
2. Upload an image by clicking the "Upload" button.
3. Select the desired frame type (participant or organizer).
4. Adjust the image as needed.
5. Click the "Download" button to download the final framed image.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
