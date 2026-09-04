using UnrealBuildTool;

public class DesktopAvatarAudioBridge : ModuleRules
{
    public DesktopAvatarAudioBridge(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "Sockets",
            "LiveLink",
            "LiveLinkInterface",
            "MetaHumanLiveLinkSource",
            "MetaHumanLocalLiveLinkSource",
            "MetaHumanPipelineCore",
            "MetaHumanCoreTech",
            "SpeechAnimationSolver"
        });
    }
}
