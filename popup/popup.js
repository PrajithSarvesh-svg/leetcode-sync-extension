const listcontainer = document.getElementsByClassName("main-body");
const button_sync = document.querySelector(".sync-github");


button_sync.addEventListener("click", async () => {

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'insomnia/12.3.1',
            Authorization: 'Bearer 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'
        },
        body: '{"message":"test upload","content":"LyoqCiAqIERlZmluaXRpb24gZm9yIHNpbmdseS1saW5rZWQgbGlzdC4KICogcHVibGljIGNsYXNzIExpc3ROb2RlIHsKICogICAgIGludCB2YWw7CiAqICAgICBMaXN0Tm9kZSBuZXh0OwogKiAgICAgTGlzdE5vZGUoKSB7fQogKiAgICAgTGlzdE5vZGUoaW50IHZhbCkgeyB0aGlzLnZhbCA9IHZhbDsgfQogKiAgICAgTGlzdE5vZGUoaW50IHZhbCwgTGlzdE5vZGUgbmV4dCkgeyB0aGlzLnZhbCA9IHZhbDsgdGhpcy5uZXh0ID0gbmV4dDsgfQogKiB9CiAqLwpjbGFzcyBTb2x1dGlvbiB7CiAgICBwdWJsaWMgTGlzdE5vZGUgYWRkVHdvTnVtYmVycyhMaXN0Tm9kZSBsMSwgTGlzdE5vZGUgbDIpIHsKICAgICAgICBMaXN0Tm9kZSBkdW1teSA9IG5ldyBMaXN0Tm9kZSgpOwogICAgICAgIExpc3ROb2RlIGN1cnIgPSBkdW1teTsKICAgICAgICBpbnQgY2FycnkgPSAwOwogICAgICAgIHdoaWxlKChsMSE9bnVsbCB8fCBsMiE9bnVsbCkgfHwgY2FycnkhPTApCiAgICAgICAgewogICAgICAgICAgICBpbnQgc3VtID0wOwogICAgICAgICAgICBpZihsMSE9bnVsbCkKICAgICAgICAgICAgewogICAgICAgICAgICAgICAgc3VtKz1sMS52YWw7CiAgICAgICAgICAgICAgICBsMSA9IGwxLm5leHQ7CiAgICAgICAgICAgIH0KICAgICAgICAgICAgaWYobDIhPW51bGwpCiAgICAgICAgICAgIHsKICAgICAgICAgICAgICAgIHN1bSs9bDIudmFsOwogICAgICAgICAgICAgICAgbDIgPSBsMi5uZXh0OwogICAgICAgICAgICB9CiAgICAgICAgICAgIHN1bSs9Y2Fycnk7CiAgICAgICAgICAgIGNhcnJ5ID0gc3VtLzEwOwogICAgICAgICAgICBMaXN0Tm9kZSBpbnNlcnQgPSBuZXcgTGlzdE5vZGUoc3VtJTEwKTsKICAgICAgICAgICAgY3Vyci5uZXh0ID0gaW5zZXJ0OwogICAgICAgICAgICBjdXJyID0gY3Vyci5uZXh0OwogICAgICAgIH0KICAgICAgICByZXR1cm4gZHVtbXkubmV4dDsKICAgIH0KfQ=="}'
    };

    fetch('https://api.github.com/repos/PrajithSarvesh-svg/DSA/contents/0002-add-two-numbers/test_13.java', options)
        .then(response => response.json())
        .then(response => console.log(response))
        .catch(err => console.error(err));
});