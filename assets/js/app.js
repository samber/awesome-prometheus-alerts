$(function () {
    var clipboardRules = new ClipboardJS('.clipboard-single', {
        text: function (trigger) {
            const id = trigger.getAttribute('data-clipboard-target-id');
            const html = $("#" + id + " .highlight");
            return html.text();
        },
    });
    var clipboardCategories = new ClipboardJS('.clipboard-multiple', {
        text: function (trigger) {
            const id = trigger.getAttribute('data-clipboard-target-id');
            const html = $("[id^=" + id + "] .highlight");
            return html.append("\n\n").text();
        },
    });
});