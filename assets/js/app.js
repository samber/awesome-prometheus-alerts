$(function () {
    var clipboardRules = new ClipboardJS('.clipboard-single', {
        text: function (trigger) {
            const id = trigger.getAttribute('data-clipboard-target-id');
            const html = $("#" + id + " .highlight");
            return html.text() + '\n';
        },
    });
    var clipboardCategories = new ClipboardJS('.clipboard-multiple', {
        text: function (trigger) {
            const id = trigger.getAttribute('data-clipboard-target-id');
            const html = $("[id^=" + id + "] .highlight");
            return Array.from(html.map((i, target) => $(target).text())).join('\n\n');
        },
    });
});
