﻿// --------------------------------------------------------------------------------------------------------------------
// <copyright company="Outercurve Foundation">
//   Copyright (c) 2013, The Outercurve Foundation
// </copyright>
// --------------------------------------------------------------------------------------------------------------------

using System;
using System.Data.Entity;
using System.Diagnostics;

namespace Chronozoom.Entities
{
    /// <summary>
    /// Storage implementation for ChronoZoom based on Entity Framework.
    /// </summary>
    public class Storage : DbContext
    {
        static Storage()
        {
            Trace = new TraceSource("Storage", SourceLevels.All);
        }

        public Storage()
        {
            Database.SetInitializer(new StorageChangeInitializer());
            Configuration.ProxyCreationEnabled = false;
        }

        public static TraceSource Trace { get; private set; }

        public DbSet<Timeline> Timelines { get; set; }

        public DbSet<Threshold> Thresholds { get; set; }

        public DbSet<Exhibit> Exhibits { get; set; }

        public DbSet<ContentItem> ContentItems { get; set; }

        public DbSet<Reference> References { get; set; }

        public DbSet<Tour> Tours { get; set; }

        private class StorageChangeInitializer : CreateDatabaseIfNotExists<Storage>
        {
            protected override void Seed(Storage context)
            {
                if (context == null)
                {
                    throw new ArgumentNullException("context");
                }

                Trace.TraceInformation("Seeding database with data");
                context.Timelines.Add(new Timeline { ID = Guid.NewGuid(), UniqueID = 655, Title = "Hello world", FromYear = 711, ToYear = 1492, Height = 20, FromTimeUnit = "CE", ToTimeUnit = "CE" });
            } 
        }
    }
}