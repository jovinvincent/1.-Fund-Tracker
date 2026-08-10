from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
import os

APP_URL = os.getenv("APP_URL", "https://ais-dev-twaf5v3niposla3rznryci-680968902783.europe-west2.run.app")

def wake_app():
    print("Starting headless Chrome browser...")
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(options=options)

    try:
        print(f"Opening your app: {APP_URL}")
        driver.get(APP_URL)
        time.sleep(15)
        print("Page title:", driver.title)
        print("App successfully pinged and kept awake via Selenium!")
    except Exception as e:
        print(f"Something went wrong during wake up: {e}")
        return 1
    finally:
        driver.quit()

    return 0

if __name__ == "__main__":
    exit(wake_app())
