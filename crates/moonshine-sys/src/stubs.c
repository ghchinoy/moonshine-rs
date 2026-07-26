#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32) || defined(_WIN64)
#define WEAK_SYMBOL __declspec(selectany)
#else
#define WEAK_SYMBOL __attribute__((weak))
#endif

// Fallback weak implementation of moonshine_get_stt_catalog for prebuilt release archives
// that predated moonshine_get_stt_catalog in C API binary.
WEAK_SYMBOL int32_t moonshine_get_stt_catalog(char **out_catalog_json) {
    if (out_catalog_json == NULL) {
        return -1; // MOONSHINE_ERROR_INVALID_ARGUMENT
    }
    const char *catalog = "{\"languages\":[{\"code\":\"en\",\"english_name\":\"English\",\"models\":[{\"arch\":0,\"name\":\"tiny-en\"},{\"arch\":1,\"name\":\"base-en\"}]}]}";
    size_t len = strlen(catalog) + 1;
    char *buf = (char *)malloc(len);
    if (buf != NULL) {
        memcpy(buf, catalog, len);
    }
    *out_catalog_json = buf;
    return 0; // MOONSHINE_ERROR_NONE
}
