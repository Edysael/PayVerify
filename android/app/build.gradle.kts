plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.legaltechit.payverify"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.legaltechit.payverify"
        minSdk = 26
        targetSdk = 35
        // En CI la versión viene del número de ejecución, para que cada APK publicado actualice al anterior.
        versionCode = (System.getenv("PV_VERSION_CODE") ?: "3").toInt()
        versionName = System.getenv("PV_VERSION_NAME") ?: "0.4.0"
        buildConfigField("String", "SUPABASE_URL", "\"https://fzumtynskvcrybzejmbo.supabase.co\"")
        // Clave pública (publishable) de Supabase: es la misma que usa el panel web; no es secreta.
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", "\"sb_publishable_GpmOxN3xFlE1ryDVxmDYdg_cttADajQ\"")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    // Firma de release: la clave vive solo en los secretos de GitHub (nunca en el repo, que es público).
    val keystorePath = System.getenv("PV_KEYSTORE_PATH")
    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("PV_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("PV_KEY_ALIAS")
                keyPassword = System.getenv("PV_KEYSTORE_PASSWORD")
                storeType = "PKCS12"
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystorePath != null) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures { compose = true; buildConfig = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    testImplementation("junit:junit:4.13.2")
}
