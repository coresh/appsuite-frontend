import com.openexchange.build.git.GitExtension

buildscript {
    repositories {
        maven {
            url = uri("https://artifactory.open-xchange.com/artifactory/libs-release")
        }
    }
    dependencies {
        classpath("com.openexchange.build", "project-type-scanner", "[1.2.1,2.0[")
        classpath("com.openexchange.build", "gradle-git", "[2.2.0,3.0[")
        classpath("com.openexchange.build", "licensing")
        classpath("com.openexchange.build", "packaging", "[3.1.0,4.0[")
        classpath("com.openexchange.build", "opensuse-build-service-client", "[1.5.0,2.0[")
    }
}

apply {
    plugin("com.openexchange.build.licensing")
    plugin("com.openexchange.build.install")
    plugin("com.openexchange.build.gradle-git")
    plugin("com.openexchange.build.opensuse-build-service-client")
}

subprojects {
    apply {
        plugin("com.openexchange.build.install")
        plugin("com.openexchange.build.packaging")
    }
}

configure<com.openexchange.build.licensing.LicensingExtension> {
    licenses {
        register("core/ui") {
            this.sourceFile = File(project.projectDir, "LICENSE")
        }
    }
}

configure<com.openexchange.obs.gradle.plugin.BuildserviceExtension> {
    url = "https://buildapi.open-xchange.com"
    login  = System.getenv("OBS_USERNAME")
    password = System.getenv("OBS_PASSWORD")
    obsProject {
        val gitExtension = extensions.getByType(GitExtension::class.java)
        val versionTag = gitExtension.newestVersionTag
        val branch = gitExtension.branchName
        val regex = Regex("[^A-Za-z0-9-_]")
        val extension = when {
            versionTag?.commitDistance == 0L -> "${versionTag.versionWithoutRevision}-rev${versionTag.revisionMajor}"
            branch.startsWith("master") or branch.startsWith("release") -> branch
            System.getenv("OBS_PROJECT_EXT") != null -> System.getenv("OBS_PROJECT_EXT")
            else -> regex.replace(branch, "_")
        }
        name = "frontend-$extension"
        repositories {
            create("DebianStretch") {
                depends("Debian:Stretch", "standard")
            }
            create("DebianBuster") {
                depends("Debian:Buster", "standard")
            }
            create("RHEL6") {
                // TODO go down to the base RHEL 6 repository
                depends("backend-master", "RHEL6")
            }
            create("RHEL7") {
                // TODO go down to the base RHEL 7 repository
                depends("backend-master", "RHEL7")
            }
            create("SLE_12") {
                // TODO go to SP4
                depends("backend-master", "SLE_12")
            }
        }
    }
}

configure<com.openexchange.build.install.extension.InstallExtension> {
    prefix.set(file("/opt/open-xchange"))
}